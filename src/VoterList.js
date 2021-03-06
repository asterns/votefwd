// src/VoterList.js

import React, { Component } from 'react';
import axios from 'axios';
import moment from 'moment';
import download from 'js-file-download';

class VoterRecord extends Component {
  constructor(props) {
    super(props)
    this.state = { downloadingLetter : false }
  }

  downloadLetterForVoter(voter_id) {
    axios({
     method: 'GET',
      headers: {Authorization: 'Bearer '.concat(localStorage.getItem('access_token'))},
      url: `${process.env.REACT_APP_API_URL}/voters/downloadLetter`,
      params: { voter_id: voter_id },
      responseType: "blob"
    })
    .then(res => {
      download(res.data, res.headers.filename);
    })
    .catch(err => {
      console.error(err);
    });
  }

  render() {
    let voter = this.props.voter;
    let voterActions;
    let voterDownloadButton;

    let today = moment();
    let electionDate = moment('2018-11-06');
    let sendDate = electionDate.subtract(7, "days");
    let readyToSend;
    today < sendDate ? readyToSend = false : readyToSend = true;

    if (!voter.confirmed_prepped_at) {
      voterDownloadButton = (
        <button className="btn btn-sm btn-link" onClick={() => {this.downloadLetterForVoter(voter.id)}}>
          <i className="icon-arrow-down-circle icons"></i> Download letter
        </button>
      );
      voterActions = (
        <div>
          <span className="small u-quiet mr-2">Prepared?</span>
          <button className="btn btn-sm btn-success" onClick={() => {this.props.confirmPrepped(voter)}}>
            <i className="fa fa-check" aria-hidden="true"></i>
          </button>
        </div>
      );
    }
    else if (voter.confirmed_prepped_at && !voter.confirmed_sent_at) {
      voterActions = (
        <div className="btn-group">
          <button className="btn btn-success btn-sm" onClick={() => {this.props.undoConfirmPrepped(voter)}}>
            <i className="fa fa-chevron-left" aria-hidden="true"></i>
          </button>
          <button disabled={!readyToSend} className="btn btn-success btn-sm" onClick={() => {this.props.confirmSent(voter)}}>
            <span>Sent</span>
            <i className="fa fa-chevron-right ml-2" aria-hidden="true"></i>
          </button>
        </div>
      )
    }
    else {
      voterActions = (
        <div className="btn-group">
          <button className="btn btn-success btn-sm" onClick={() => {this.props.undoConfirmSent(voter)}}>
            <i className="fa fa-chevron-left" aria-hidden="true"></i>
          </button>
        </div>
      )
    }

    return (
      <li className="list-group-item" key={voter.id}>
        <div className="d-flex w-100 mb-1">
          <div className="w-50">
            <strong>{voter.first_name} {voter.last_name}</strong><br />
            <small>{voter.city}, {voter.state}</small><br />
            {voterDownloadButton}
          </div>
          <div className="w-50 d-flex justify-content-end align-items-center">
            {voterActions}
          </div>
        </div>
      </li>
    )
  }
}

export class VoterList extends Component {
  constructor(props) {
    super(props)

    this.downloadBundle = this.downloadBundle.bind(this);
    this.markAllPrepped= this.markAllPrepped.bind(this);
    this.cancelMarkAllPrepped = this.cancelMarkAllPrepped.bind(this);
    this.state= { 
      downloadingBundle: false,
      markingAllPrepped: false
    };
  }

  downloadBundle() {
    this.setState({downloadingBundle: true});
    axios({
     method: 'GET',
      headers: {Authorization: 'Bearer '.concat(localStorage.getItem('access_token'))},
      url: `${process.env.REACT_APP_API_URL}/voters/downloadAllLetters`,
      params: { user_id: localStorage.getItem('user_id')},
      responseType: "blob"
    })
    .then(res => {
      download(res.data, res.headers.filename);
      this.setState({downloadingBundle: false});
    })
    .catch(err => {
      console.error(err);
    });
  }

  markAllPrepped() {
    this.props.markAllPrepped();
    this.cancelMarkAllPrepped();
  }

  cancelMarkAllPrepped() {
    this.setState({markingAllPrepped: false});
  }

  render() {
    let toPrep = this.props.voters.filter(voter => !voter.confirmed_prepped_at);
    let toSend = this.props.voters.filter(voter => voter.confirmed_prepped_at && !voter.confirmed_sent_at);
    let alreadySent = this.props.voters.filter(voter => voter.confirmed_sent_at);
    let alertContent;
    if (this.state.downloadingBundle) {
      alertContent = (
        <div className="alert alert-warning mt-3 mb-3 center" role="alert">Preparing batch to download...this may take a minute.</div>
      );
    }
    let allPreppedButton;
    if (!this.state.markingAllPrepped) {
      allPreppedButton = (
        <button disabled={this.state.downloadingBundle ? true : false} className="btn btn-light btn-sm ml-2" onClick={() => this.setState({markingAllPrepped: true})}>
          <i className="fa fa-check"></i> All prepared 
        </button>
      )
    }
    else {
      allPreppedButton = (
        <div className="alert alert-warning ml-3" role="alert">
          <p>Are you sure?</p>
          <button className="btn btn-success btn-sm mr-2" onClick={this.markAllPrepped}>
            <i className="fa fa-check"></i> Yes!
          </button>
          <button className="btn btn-danger btn-sm" onClick={this.cancelMarkAllPrepped}>
            <i className="fa fa-times"></i> Cancel
          </button>
        </div>
      )
    }
    return (
      <div className="px-5 pb-5">
        <h2 className="pt-2 mb-4">Your letters</h2>
        <div className="row">
          <div className="col">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span><strong>Letters to Prepare</strong> ({toPrep.length})</span>
                {toPrep.length > 1 &&
                  <React.Fragment>
                    <button disabled={this.state.downloadingBundle ? true : false} className="btn btn-light btn-sm" onClick={this.downloadBundle}>
                      <i className="icon-arrow-down-circle icons"></i> Download all
                    </button>
                    {allPreppedButton}
                  </React.Fragment>
                }
              </div>
              {alertContent}
            </div>
            <ul className="list-group">
              {toPrep.length < 1 &&
                <li className="list-group-item disabled text-center py-5 bg-light">
                  There are no letters to prepare.
                </li>
              }
              {toPrep.map(voter =>
                <VoterRecord
                  key={voter.id}
                  voter={voter}
                  confirmPrepped={this.props.confirmPrepped}
                />)}
            </ul>
          </div>

          <div className="col mx-2">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span><strong>Letters Prepared</strong> ({toSend.length})</span>
              <span className="badge badge-warning ml-2">Mail on Tuesday, October 30!</span>
            </div>
            <ul className="list-group">
              {toSend.length < 1 &&
                <li className="list-group-item disabled text-center py-5 bg-light">
                  There are no letters to send.
                </li>
              }
              {toSend.map(voter =>
                <VoterRecord
                  key={voter.id}
                  voter={voter}
                  confirmSent={this.props.confirmSent}
                  undoConfirmPrepped={this.props.undoConfirmPrepped}
                />)}
            </ul>
          </div>

          <div className="col">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span><strong>Letters Sent</strong> ({alreadySent.length})</span>
            </div>
            <ul className="list-group">
              {alreadySent.length < 1 &&
                <li className="list-group-item disabled text-center py-5 bg-light">
                  You haven’t sent any letters yet.
                </li>
              }
              {alreadySent.map(voter =>
                <VoterRecord
                  key={voter.id}
                  voter={voter}
                  undoConfirmSent={this.props.undoConfirmSent}
                />)}
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
