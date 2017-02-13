/* eslint-env es6

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

import React from 'react';
import ReactDOM from 'react-dom';

class Overview extends React.Component {
  constructor (props) {
    super(props);
    this.state = {
    };
  }

  render () {
    return (
      <div>
        <h3>Documentation</h3>
        <hr />
        GitHub link: <a href="https://github.com/pmservice/product-line-prediction" target="_blank">https://github.com/pmservice/product-line-prediction</a>
        <hr />
        <h4>This sample application shows you how to easily score data using an IBM Watson Machine Learning online deployment.</h4>
        <br/>
        <p>With this sample scoring application, you can:</p>
        <ul>
          <li>Select an online deployment based on a <i>{this.context.modelName}</i> sample model</li>
          <li>Use the Input data field to easily drag-and-drop a CSV file that contains input data for scoring (or double-click the field to open a file browser)</li>
          <li>Click the <b>Get Score</b> button to call the Machine Learning REST API</li>
          <li>Display scoring results in the form of a table</li>
          <br/>
            <a href="images/scoring_result.png"><img src="images/scoring_result.png" alt="Scoring screen" width="100%" /></a>
        </ul>
      </div>
    );
  }
}

Overview.contextTypes = {
  modelName: React.PropTypes.string
};

module.exports = Overview;
