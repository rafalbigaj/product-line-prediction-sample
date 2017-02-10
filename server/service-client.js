/* eslint-env node es6

   Copyright 2016 IBM Corp.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

'use strict';

const request = require('request');
const log4js = require('../utils/log4js-logger-util');
const logger = log4js.getLogger('server/service-client');
const debug = require('debug')('sample');
const config = require('../config');
const TOKEN_PATH = '/v2/identity/token';

function getTokenFromTokenEndoint(tokenEndpoint, user, password) {
  debug('getTokenFromTokenEndoint', tokenEndpoint);
  return new Promise((resolve, reject) => {
    request.get(tokenEndpoint + TOKEN_PATH, {
      strictSSL: false,
      auth: {
        'user': user,
        'pass': password
      }
    }, function (err, res, body) {
      if (err) {
        reject(err);
      }
      debug('got response:', body);
      if (!res || !res.statusCode) {
        reject(new Error('Token Endpoint failure'));
      } else {
        switch (res.statusCode) {
        case 200:
          resolve(JSON.parse(res.body).token);
          break;
        default:
          reject(new Error(`Token Endpoint returned ${res.statusCode}.
            Make sure the user is privileged to perform REST API calls.`));
        }
      }
    });
  });
}

const ServiceClient = module.exports = function (service) {
  if (service) {
    this.credentials = service.credentials;
  }
};

ServiceClient.prototype = {

  isAvailable: function () {
    return (this.credentials != null);
  },

  performRequest: function (options, callback) {
    getTokenFromTokenEndoint(
      this.credentials.url,
      this.credentials.username,
      this.credentials.password
    )
    .then((token) => {
      options.headers = {Authorization: 'Bearer ' + token};
      options.uri = options.uri.startsWith('http') ? options.uri : this.credentials.url + options.uri;
      debug(`url: ${options.uri}`);
      request(options, callback);
    })
    .catch((err) => {
      callback && callback(err);
    });
  },

  getScore: function (scoringHref, scoreParam, callback) {
    logger.enter('getScore()', 'scoringHref: ' + scoringHref + ', scoreParam: ' + scoreParam);

    let result = scoreParam.map((row, index, array) => {
      let options = {
        method: 'PUT',
        uri: scoringHref,
        headers: {'content-type': 'application/json'}
      };

      let input = JSON.stringify({record: row});
      debug(input);
      options.body = input;

      return new Promise((resolve, reject) => {
        this.performRequest(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            var scoreResponse = JSON.parse(body);
            logger.info('getScore()', `successfully finished scoring for scoringHref ${scoringHref}`);
            resolve({score: scoreResponse});
          } else if (error) {
            logger.error(error);
            resolve({error: JSON.stringify(error.message)});
          } else {
            let error = new Error(JSON.stringify('Service error code: ' + response.statusCode));
            if (typeof response.body !== 'undefined') {
              try {
                error = new Error(JSON.stringify(JSON.parse(response.body).message));
              } catch (e) {
                // suppress
              }
            }
            logger.error(`getScore() error during scoring for scoringHref: ${scoringHref}, msg: ${error}`);
            debug(error, 'body: ', response.body);
            resolve({error: error});
          }
        });
      });
    });

    Promise.all(result)
    .then((r) => {
      let errors = [];
      let score = [];
      r.forEach((rPiece) => {
        if (rPiece.score)
          score.push(rPiece.score.result);
        else if (rPiece.error)
          errors.push(rPiece.error.message);
      });

      debug(`result, score: ${score}, errors: ${errors}`);
      callback && callback(errors, score);
    })
    .catch((error) => {
      callback && callback([error.message]);
    });
  },

  _getModels: function (callback) {
    logger.enter('getModels()');
    let options = {
      method: 'GET',
      uri: '/v2/artifacts/models'
    };

    this.performRequest(options, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        let models = JSON.parse(body).resources;
        debug('all models', models);
        models = models
          .filter(model => {
            let {name} = model.entity;
            return name === config('model-name');
          })
          .map(model => model.metadata.guid);
        debug(`guids of ${config('model-name')} models`, models);
        return callback(null, models);
      } else if (error) {
        logger.error('getModels()', error);
        return callback(error.message);
      } else {
        error = new Error('Service error code: ' + response.statusCode);
        logger.error('getModels()', error);
        return callback(error.message);
      }
    });
  },

  getDeployments: function (callback) {
    logger.enter('getDeployments()');

    let options = {
      method: 'GET',
      uri: '/v2/online/deployments'
    };

    this._getModels((error, result) => {
      if (error) {
        return callback(error);
      } else {
        let expectedModelGuids = result;

        this.performRequest(options, (error, response, body) => {
          if (!error && response.statusCode === 200) {
            let deployments = JSON.parse(body);
            deployments = deployments && deployments.resources;
            debug('all deployments', deployments);
            let re = new RegExp('/v2/artifacts/models/([^/]+)/versions');
            deployments = deployments
              .filter(item => {
                let deplModelHref = item.entity.artifactVersion.href;
                return expectedModelGuids.some(emg => {
                  let [, modelGuid] = deplModelHref.match(re);
                  return emg === modelGuid;
                });
              })
              .map((item) => {
                let result = item.entity;
                result.modelSchema = config('model-schema');
                result.sampleInput = config('model-sample-input');
                result.predictionMapping = config('model-prediction-mapping');
                result.id = item.metadata.guid;
                return result;
              });
            debug('matching & prepared online deployments: ', deployments);
            return callback(null, deployments);
          } else if (error) {
            logger.error('getDeployments()', error);
            return callback(error.message);
          } else {
            error = new Error('Service error code: ' + response.statusCode);
            logger.error('getDeployments()', error);
            return callback(error.message);
          }
        });
      }});
  }
};
