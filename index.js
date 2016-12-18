#!/usr/bin/env node

/* eslint no-console: 0 */
'use strict';

var sattrack = require('./lib');
var got = require('got');
var fs = require('fs');
const Configstore = require('configstore');
const pkg = require('./package.json');
var RxNode = require('rx-node');
var Rx = require('rx');
var readline = require('readline');
var moment = require('moment-timezone');
var chalk = require('chalk');
var RSVP = require('rsvp');

const conf = new Configstore(pkg.name, {
  tz: moment.tz.guess()
});
moment.tz.setDefault(conf.get('tz'));

// formatting functions
var f2 = f => f.toFixed(2); // format float to 2

var argv = require('yargs') // eslint-disable-line no-unused-vars
  .usage('Usage: $0 [command] <options>')
  .command(['update', 'u'], 'Update tle file', {}, getCelestrack)
  .command(['visible'], 'Visible tonight', {}, cmdInit(visible))
  .command(['next [satellite]'], 'next [satellite]', {}, cmdInit(nextPass))
  .command(['plot [satellite]'], 'plot [satellite]', {}, cmdInit(plot))
  .command(['config [name] [value]'], 'show/set the config', {}, cmdConfig)
  .demand(1)
  .option('day', {
    global: true,
    default: 0,
    description: 'add or remove days to the reference date'
  })
  .option('range', {
    global: true,
    default: 1,
    description: 'number of days to scan'
  })
  .alias('v', 'verbose')
  .fail(function (msg, err, yargs) { // eslint-disable-line no-unused-vars
    if (err) throw err; // preserve stack
    console.error(msg);
    process.exit(1);
  })
  .help()
  .argv;


/**
 * Initialze commands that are going to use a date range.  Creates a `now`
 * and `range` paramters.  If `days` is passes in, the `now` date is
 * changed to match the offset.
 * @param  {function} cmd The command function to execute.
 * @return {function}     The initialization function, this is usually called
 * as part of the `yargs` command.
 */
function cmdInit(cmd) {
  return function argHandler(args) {
    if (!args.now) args.now = moment();
    if (args.day) args.now.add(args.day, 'day');
    if (args.range) args.enddate = moment().add(args.range + (args.day || 0), 'day');
    cmd(args);
  };
}

/**
 * View or change configuration settings.  With no parameters,
 * prints out all config settings.  One will print out a specific setting.
 * Two, `name` and `value` will change the config setting.  `value` is parsed
 * with `JSON.parse` so complex objects can be operated on.  You can use
 * named properties, like `location.latitude` to get specific values of sub
 * objects.
 * @param  {object} argv Yargs arguments
 */
function cmdConfig(argv) {
  // console.log('cmdConfig', argv);
  if (argv.name) {
    if (argv.value) {
      conf.set(argv.name, JSON.parse(argv.value));
    }
    return console.log(argv.name, conf.get(argv.name));
  } else {
    return console.log(conf.all);
  }
}

/**
 * can a range of times for a TLE and call a check function for each one.  If
 * the check function returns true, scanning stops.
 * @param  {Object}   argv       `yarg` arguments
 * @param  {Function}   getOptions function to create arguments with, with the format `function(tle, location)`
 * @param  {Function}   check      function to check position values with. `function(argv, pos)`
 * @param  {Function} done       [description]
 */
function withTleAndLocaton(argv, getOptions, check, done) {
  RSVP.hash({
    tle: getTLE(undefined, argv.satellite),
    location: getLocation()
  }).then(function (results) {

    var options = Object.assign({}, {
      location: results.location
    }, getOptions ? getOptions(results.tle, results.location) : {});

    sattrack.range(results.tle, options, function (pos) {
      return check(argv, pos);
    });

    if (done) done(argv);
  }).catch(function (err) {
    console.error('err', err);
  });
}

/**
 * The format string used to create a `Dusk` entry in the options array.
 * @type {String}
 */
const DUSKKEYFORMAT = 'MMM Do';

/**
 * Scans a range of times for visible positions.  Dusk ranges are
 * calculated for each day in the range and passed to the `hooks.check` function.
 * @param  {Object} argv  `yargs` arguments
 * @param  {Object} hooks object of hook functions.
 * @param  {Function} hooks.header called before the range loop starts. `function(tle, location)`
 * @param  {Function} hooks.check called on each range check.  If `check` returns true, the scan is stopped.  `function(argv, pos, options)`
 * @param  {Function} hooks.done called at the end of the range loop.  The last position that `check` returned true for is stored in `pass`.  `function(argv, pass)`
 */
function scanRange(argv, hooks) {
  var pass, options = {};

  withTleAndLocaton(argv, function setOptions(tle, location) {
    /*
      If the number of days in the range is 1, then the range and dusk values
      are just the dusk range, with one value in the dusk object.
     */
    var days = argv.enddate.diff(argv.now, 'days');
    options.dusk = {};
    if (days == 1) {
      options.range = sattrack.duskRange(argv.now.toDate(), location).map(d => d.toDate());
      options.dusk[argv.now.format(DUSKKEYFORMAT)] = options.range;
    } else {
      /*
        It get complex when scanning multiple days, the range start is the first
        days dusk start, and the range end is the last days dusk end.
        An entry for each day is needed in `dusk`.
       */
      var startDusk = sattrack.duskRange(argv.now.toDate(), location)[0].toDate();
      var endDusk = sattrack.duskRange(argv.enddate.toDate(), location)[1].toDate();
      options.range = [startDusk, endDusk];
      for (var i = 0; i <= days; i++) {
        var day = argv.now.clone().add(i, 'days');
        options.dusk[day.format(DUSKKEYFORMAT)] = sattrack.duskRange(day.toDate(), location).map(d => d.toDate());
      }
    }

    if (hooks.header) hooks.header(tle, location, options);

    return options;
  }, function callCheck(argv, pos) {
    if (hooks.check(argv, pos, options)) {
      pass = pos;
      return true;
    }
  }, function callDone() { // eslint-disable-line no-unused-vars
    if (hooks.done) hooks.done(argv, pass, options);
  });
}

function nextPass(argv) {
  function check(argv, pos, options) {
    var t = moment(pos.time);
    var dusk = options.dusk[t.format(DUSKKEYFORMAT)];
    // console.log(t.format('LT MMM Do'), dusk.map(d => moment(d).format('LT MMM Do')), t.isBetween(dusk[0], dusk[1]));
    if (pos.sat.alt > 15 && t.isBetween(dusk[0], dusk[1])) {
      console.log(`"${moment(pos.time).format('LT MMM Do')}" ${f2(pos.sat.longitude)} ${f2(pos.sat.latitude)}`);
      return true;
    }
  }

  function done(argv, pass, options) {
    if (!pass) console.log('no pass between', options.range.map(d => moment(d).format('LT MMM Do')));
  }
  scanRange(argv, {
    check,
    done
  });
}

function plot(argv) {
  var lastpass;

  function check(argv, pos, options) {
    var t = moment(pos.time);
    var d = t.format(DUSKKEYFORMAT);
    var dusk = options.dusk[d];
    // console.log(t.format('LT MMM Do'), dusk.map(d => moment(d).format('LT MMM Do')), t.isBetween(dusk[0], dusk[1]));

    if (pos.sat.alt > 15 && t.isBetween(dusk[0], dusk[1])) {
      // print a blank line between passes
      if (lastpass != d) {
        if (lastpass) console.log('\n');
        console.log(`"${d}"`);
      }
      lastpass = d;

      console.log(`"${moment(pos.time).format('LT')}" ${f2(pos.sat.longitude)} ${f2(pos.sat.latitude)}`);
    }
  }

  function header(tle, location, options) {
    var range = options.range.map(d => moment(d).format('MMM Do')).join(' - ');
    console.log(`${location.longitude} ${location.latitude} ${argv.satellite} ${range}`);
  }

  scanRange(argv, {
    check,
    header
  });
}


function visible(argv) {
  var tle = getFile(argv.file)
    .bufferWithCount(3);

  Rx.Observable.combineLatest(tle, getLocation(),
      function project(tle, location) {
        return {
          tle,
          location
        };
      })
    .map(function (data) {
      var options = {
        location: data.location,
        range: sattrack.duskRange(argv.now.toDate(), data.location).map(d => d.toDate())
      };

      return Object.assign(data, {
        pos: sattrack.visible(data.tle, options)
      });
    })
    .filter(x => x.pos)
    .toArray()
    .map(x => x.sort((a, b) => a.pos.time < b.pos.time ? -1 : 1))
    .subscribe(function (positions) {
      // console.log(positions);
      positions.forEach(function (data) {
        console.log(`${data.tle[0].trim()} visible at ${moment(data.pos.time).format('LT')} az:${data.pos.sat.az.toFixed(1)} alt:${data.pos.sat.alt.toFixed(1)}`);
      });
    });
}

function HttpGet(url, options) {
  options = Object.assign({}, {
    headers: {
      'user-agent': `${pkg.name}/${pkg.version} (${pkg.repository})`
    }
  }, options);
  console.log(chalk.green('HttpGet %j %j'), url, options);
  return got.get(url, options);
}

function getLocation() {
  var location = conf.get('location');
  // console.log(chalk.green('getLocation %j'), location);

  if (location && location.latitude && location.longitude) {
    return RSVP.Promise.resolve(location);
  }

  return HttpGet('freegeoip.net/json/', {
    json: true
  }).then(function (location) {
    // console.log(chalk.red('getLocation %j'), location.body);
    conf.set('location', location.body);
    return location.body;
  });

}

function getCelestrack() {
  HttpGet('www.celestrak.com/NORAD/elements/visual.txt')
    .then(function (response) {
      console.log('response.body', response.body);
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
  var observable = getFile(file)
    .skipWhile(function (x) {
      return satellite && !x.startsWith(satellite);
    })
    .take(3)
    .reduce(function (result, value) {
      result.push(value);
      return result;
    }, []);

  if (cb) {
    observable.subscribe(function (tle) {
      cb(null, tle);
    }, cb);
  } else {
    return observable.toPromise(RSVP.Promise);
  }
}
