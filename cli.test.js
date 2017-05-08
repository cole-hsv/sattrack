'use strict';

var assert = require('assert');
var cli = require('./index.js');
var chalk = require('chalk');
// var moment = require('moment-timezone');

/**
 * fail on unhandle see: http://eng.wealthfront.com/2016/11/03/handling-unhandledrejections-in-node-and-the-browser/
 */
process.on('unhandledRejection', function (reason) {
  console.error(chalk.red('Unhandled promise rejection'), reason);
  process.exit(1);
});

describe('cli', function () {

  it('cli should exist', function () {
    assert(cli);
    assert(cli.range);
    assert(cli.visible);
    assert(cli.getTLE);
    assert(cli.getCelestrack);
    assert(cli.CELSTRACKURL);
  });

  it('should download a TLE set from Celestrak', function () {
    cli.getCelestrack({
      tlefilename: './visual.txt',
      tleurl: cli.CELSTRACKURL + 'visual.txt'
    }).then(function (tle) {
      return assert(tle);
    }).catch(function error(err) {
      assert.ifError(err);
    });
  });

  it('should get a TLE from a file: ISS', function () {
    cli.getTLE('visual.txt', 'ISS').then(function (tle) {
      assert(tle);
      assert.equal(tle[0].trim(), 'ISS (ZARYA)');
      assert.equal(tle[1].split(' ')[0], 1); // line 1 should start with 1
      assert.equal(tle[2].split(' ')[0], 2); // line 2 should start with 2
      return tle;
    }).catch(function error(err) {
      assert.ifError(err);
    });
  });

  it('should get a TLE from a file: /zarya/', function () {
    cli.getTLE('visual.txt', '/zarya/').then(function (tle) {
      assert(tle);
      assert.equal(tle[0].trim(), 'ISS (ZARYA)');
      assert.equal(tle[1].split(' ')[0], 1); // line 1 should start with 1
      assert.equal(tle[2].split(' ')[0], 2); // line 2 should start with 2
      return tle;
    }).catch(function error(err) {
      assert.ifError(err);
    });
  });

});