#!/usr/bin/env node

/* eslint no-console: 0 */
'use strict';

var sattrack = require('./');
var yargs = require('yargs');
var got = require('got');
var fs = require('fs');
const pkg = require('../package.json');
var RxNode = require('rx-node');
var readline = require('readline');
var moment = require('moment-timezone');

moment.tz.setDefault('America/Chicago');

function getCelestrack() {
  got
    .get('www.celestrak.com/NORAD/elements/visual.txt', {
      headers: {
        'user-agent': `${pkg.name}/${pkg.version} (${pkg.repository})`
      }
    })
    .then(function (response) {
      // console.log('response.body', response.body);
      fs.writeFileSync('./visual.txt', response.body);
    })
    .catch(function (err) {
      console.error('error getting tle', err);
    });
}

function getFile(file) {
  return RxNode
    .fromReadLineStream(readline.createInterface({
      input: fs.createReadStream(file || './visual.txt')
    }));
}

function getTLE(file, satellite, cb) {
  getFile(file)
    .skipWhile(function (x) {
      return satellite && !x.startsWith(satellite);
    })
    .take(3)
    .reduce(function (result, value) {
      result.push(value);
      return result;
    }, [])
    .subscribe(function (tle) {
      cb(null, tle);
    }, cb);
}

function getTonight(argv) {
  var location = {
    lat: 34.6233,
    lon: -86.5364
  };
  var now = moment().add(12, 'hours').toDate();
  var daterange = sattrack.duskRange(now, location);
  // console.log('daterange', daterange.map(d => d.format('LLL z')), daterange.map(d => d.unix()));
  getFile(argv.file)
    .bufferWithCount(3)
    .map(function (tle) {
      var track = sattrack.find(tle, {
        range: daterange.map(d => d.toDate()),
        location: location
      });
      return track;
    })
    .filter(x => x && x.time > now)
    .toArray()
    .subscribe(function (tracks) {
      // console.log(tracks.length);
      tracks
        .sort((a, b) => a.time < b.time ? -1 : 1)
        .forEach(function (track) {
          console.log(`${track.tle[0].trim()} rises at ${moment(track.time).format('LT')} on azimuth: ${track.sat.az} alt: ${track.sat.alt}`);
          // console.log(track, daterange[0].toDate().getTime() < track.i, daterange[1].toDate().getTime() > track.i);
        });
    }, console.error);
}

yargs('[--help]')
  .command(['update', 'u'], 'Update tle file', {}, getCelestrack)
  .command(['tonight'], 'Visible tonight', {}, getTonight)
  .command(['predict [satellite]', 'p'], 'Predict a pass', {}, function cmdPredict(argv) {
    getTLE(undefined, argv.satellite, function (err, tle) {
      console.log('tle', tle);
      console.log('cmdPredict', sattrack.predict(tle, {
        location: {
          lat: 34.6233,
          lon: -86.5364
        }
      }));
    });


  })
  .demand(1)
  .help()
  .wrap(yargs.terminalWidth())
  .fail(function (msg, err, yargs) {
    if (err) throw err;
  })
  .argv;
