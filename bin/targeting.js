'use strict';
var db = require('../server/db');
var Promise = require('bluebird');

/**
 * Runs targeting of voters for a given district based on Catalist data.
 *
 * Creates an experiment for the district in the `experiments` table, finds
 * unassigned voters for the district, and creates a row in `experiment_voter`
 * for each one.
 *
 * Experiment cohort of TEST and CONTROL is based on sampling rate.
 */
// TODO: Introduce flags or a configuration file for these options:
var STATE = 'MN';
// TODO(sjforman): Pad the district (or don't).
var DISTRICT = '2';
var EXPERIMENT_DESCRIPTION = 'Propensity 5-75, Dem partisanship > 90';
var CONTROL_HOLDOUT = 0.1;

// TODO: Introduce stratified sampling.
// TODO: Introduce Catalist test data.

// Note: To test this locally, you must first delete the experiment and experiment_voter tables:
// `delete from experiment_voter;`
// `delete from experiment;`

// Fisher–Yates Shuffle.
// Author: Mike Bostock
function shuffle(array) {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

// We run everything under a single transaction.
db.transaction(function(trx) {
  console.log('Started transaction.')
  db('experiment')
    .transacting(trx)
    .insert({name: STATE + DISTRICT, description: EXPERIMENT_DESCRIPTION}, 'id')
    .catch(function(error) {
      console.log(error);
      console.log('Error creating experiment.');
      trx.rollback();
      process.exit(1);
    })
    .then(function(ids_response) {
      var experiment_id = ids_response[0];
      console.log("Registered experiment with ID: ", experiment_id);
      // Find all voters from the district which are not yet part of an experiment. Note that
      // in rare cases, a single voter might be in multiple districts.
      db.raw(`
        select
          dwid
        from catalist_raw
        left join experiment_voter
          on catalist_raw.dwid = experiment_voter.voter_id
        where
          experiment_voter.voter_id is NULL
          and catalist_raw.state = ?
          and catalist_raw.congressional_district= ?`,
        [STATE, DISTRICT])
        .then(function(dwids_result) {
          var dwids = dwids_result.rows;
          shuffle(dwids);
          console.log('Found ' + dwids.length + ' unassigned dwid.');
          console.log('Assigning ' + CONTROL_HOLDOUT * 100 + '% to control.');
          var num_controls = Math.floor(dwids.length * CONTROL_HOLDOUT);
          var num_test = dwids.length - num_controls;
          console.log('Assigning ' + num_test + ' to TEST, and ' + num_controls + ' to CONTROL.');
          var experiment_voters = dwids.map(function (dwid, index) {
          var cohort = index <= num_test ? 'TEST' : 'CONTROL';
          return {'experiment_id': experiment_id, 'voter_id': dwid, 'cohort': cohort};
        });
      db('experiment_voter').transacting(trx).insert(experiment_voters).then(function() {
        console.log('Inserted experiment voters.');
        trx.commit();
      })
     .catch(function(err) {
       console.error(err);
       trx.rollback();
       process.exit(1);
     });
    })
    .catch(function(err) {
      console.error(err);
      trx.rollback();
      process.exit(1);
    });
  })
  .catch(trx.rollback);
})
.then(function(resp) {
  console.log('Transaction complete.');
  process.exit(0);
})
.catch(function(err) {
  console.error(err);
  process.exit(1);
});

