// src/Pledge.js

import React, { Component } from 'react';
import { Header } from './Header';

class Pledge extends Component {
  constructor(props) {
    super(props)

    this.state = { pledgeStatus: false }
  }

  render() {
    return (
      <div>
        <Header />
        <p className="measure">Hi</p>
        <p>{this.state.pledgeStatus}</p>
      </div>
    );
  }
}
 export default Pledge