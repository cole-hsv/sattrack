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

const CELSTRACKURL = 'www.celestrak.com/NORAD/elements/';
// formatting functions
var f2 = f => f.toFixed(2); // format float to 2

module.exports = {
  duskRange: sattrack.duskRange,
  range: sattrack.range,
  visible: sattrack.visible,
  getTLE: getTLE,
  getCelestrack: getCelestrack,
  CELSTRACKURL
};

if (!module.parent) {
  var conf = new Configstore(pkg.name, {
    tz: moment.tz.guess()
  });

  moment.tz.setDefault(conf.get('tz'));

  var argv = require('yargs') // eslint-disable-line no-unused-vars
    .usage('Usage: $0 [command] <options>')
    .command(['update', 'u'], 'Update tle file', {}, cmdInit(getCelestrack))
    .command(['visible', 'v'], 'Visible tonight', {}, cmdInit(visible))
    .command(['next [satellite]', 'n'], 'next [satellite]', {}, cmdInit(nextPass))
    .command(['plot [satellite]', 'p'], 'plot [satellite]', {}, cmdInit(plot))
    .command(['track [satellite]', 't'], 'track [satellite]', {}, cmdInit(track))
    .command(['config [name] [value]', 'c'], 'show/set the config', {}, cmdConfig)
    .demand(1)
    .option('day', {
      global: true,
      default: 0,
      description: 'add or remove days to the reference date'
    })
    .option('s', {
      alias: 'seconds',
      global: true,
      default: 0,
      description: 'add or remove seconds to the reference date'
    })
    .option('range', {
      global: true,
      default: 1,
      description: 'number of days to scan'
    })
    .option('limit', {
      global: true,
      description: 'limit number of responces'
    })
    .option('tle', {
      global: true,
      default: 'visual',
      description: 'TLE dataset to use',
      choices: ['visual', 'tle-new', 'stations', 'weather', 'supplemental/iss', 'custom', 'nasa']
    })
    .option('date', {
      global: true,
      description: 'use this time for calculating',
    })
    .option('i', {
      alias: 'immediate',
      global: true,
      description: 'use now as starting date',
      type: 'boolean'
    })
    .option('q', {
      alias: 'quiet',
      global: true,
      description: 'do not print headers',
      type: 'boolean'
    })
    .alias('v', 'verbose')
    .fail(function (msg, err, yargs) { // eslint-disable-line no-unused-vars
      if (err) throw err; // preserve stack
      console.error(chalk.red(msg));
      yargs.showHelp();
      process.exit(1);

    })
    .argv;
}

/**
 * Initialze commands that are going to use a date range.  Creates a `now`
 * and `range` paramters.  If `days` is passes in, the `now` date is
 * changed to match the offset.
 * @param  {function} cmd The command function to execute.
 * @return {function}     The initialization function, this is usually called
 * as part of the `yargs` command.
 */
function cmdInit(cmd) {
  return function argHandler(argv) {
    if (argv.date) argv.now = moment(argv.date, 'MM/DD/YYYY hh:mm:ss A');
    if (!argv.now) argv.now = moment();
    if (argv.day) argv.now.add(argv.day, 'day');
    if (argv.seconds) argv.now.add(argv.seconds, 'second');    
    if (argv.range) argv.enddate = argv.now.clone().add(argv.range + (argv.day || 0), 'day');
    // console.log('argv', argv);

    var tle_alias = {
      'supplemental/iss': {
        url: CELSTRACKURL + argv.tle + '.txt',
        filename: 'supplemental-iss.txt'
      },
      'nasa': {
        url: 'https://spaceflight.nasa.gov/realdata/sightings/SSapplications/Post/JavaSSOP/orbit/ISS/SVPOST.html',
        filename: 'nasa.txt',
        scraper: getNasa
      }
    };

    if (tle_alias[argv.tle]) {
      argv.tleurl = tle_alias[argv.tle].url;
      argv.tlefilename = tle_alias[argv.tle].filename;
      argv.scraper = tle_alias[argv.tle].scraper;
    } else {
      argv.tleurl = CELSTRACKURL + argv.tle + '.txt';
      argv.tlefilename = argv.tle + '.txt';
    }

    if (fs.existsSync(argv.tlefilename)) {
      return cmd(argv);
    } else {
      getCelestrack(argv).then(function () {
        return cmd(argv);
      }).catch(err => console.error('cmdInit:getCelestrack returned an error', err));
    }
  };
}

function HttpGet(url, options) {
  options = Object.assign({}, {
    headers: {
      'user-agent': `${pkg.name}/${pkg.version} (${pkg.repository})`
    }
  }, options);
  // console.log(chalk.green('HttpGet %j %j'), url, options);
  return got.get(url, options);
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
    tle: getTLE(argv.tlefilename, argv.satellite),
    location: getLocation()
  }).then(function (results) {
    // console.log('withTleAndLocaton', results, argv);
    if (!results.tle || results.tle.length == 0) throw new Error(`no TLE found for satellite: "${argv.satellite}"`);
    var options = Object.assign({}, {
      location: results.location
    }, getOptions ? getOptions(results.tle, results.location) : {});

    sattrack.range(results.tle, options, function (pos) {
      return check(argv, pos);
    });

    if (done) return done(argv);
    else return argv;
  }).catch(function (err) {
    console.error('withTleAndLocaton Error:', err);
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
  var pass, options = {}, runs = 0;

  withTleAndLocaton(argv, function setOptions(tle, location) {
    options.location = location;
    /*
      If the number of days in the range is 1, then the range and dusk values
      are just the dusk range, with one value in the dusk object.
     */
    var days = argv.enddate.diff(argv.now, 'days');
    // console.log('days', days);
    options.dusk = {};
    if (days == 1) {
      options.range = sattrack.duskRange(argv.now.toDate(), location).map(d => d.toDate());
      if (argv.immediate) options.range[0] = argv.now.toDate();
      // console.log('range', options);
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
    console.log(`${location.longitude} ${location.latitude} ${tle[0].trim()} ${range}`);
  }

  scanRange(argv, {
    check,
    header
  });
}

function track(argv) {
  var runs = 0;
  function check(argv, pos, options) {
    // if `argv.limit` is set and there have been more positive runs
    // then return true immediately
    if (argv.limit && runs >= argv.limit) {
      return true;
    }
    var t = moment(pos.time);
    var d = t.format(DUSKKEYFORMAT);
    var dusk = options.dusk[d];
    // console.log(t.format('hh:mm:ss A MMM Do'), dusk.map(d => moment(d).format('LT MMM Do')), t.isBetween(dusk[0], dusk[1]), pos.sat.alt);

    if (pos.sat.alt > 15 && t.isBetween(dusk[0], dusk[1])) {
      runs++;

      // console.log(pos.sat.gmst, pos.sat.alt, pos.sat.az, options.location.latitude, options.location.longitude);
      var e = sattrack.AltAz2RaDecDeg(pos.sat.gmst, pos.sat.alt, pos.sat.az, options.location.latitude, options.location.longitude);
      // var e = {};
      // console.log('pos', options);
      console.log(`${moment(pos.time).format('hh:mm:ssA')} ${f2(pos.sat.alt)} ${f2(pos.sat.az)} ${e.ra} ${e.dec}`);
    }
  }

  function header(tle, location, options) {
    // console.log('options', options, tle);
    var ascendingNode = tle[2].split(' ')[4];
    var range = options.range.map(d => moment(d).format('MMM Do')).join(' - ');
    if (!argv.quiet) console.log(`${location.longitude} ${location.latitude} ${tle[0].trim()} ${range} ascending node: ${ascendingNode}`);
  }

  scanRange(argv, {
    check,
    header
  });
}


function visible(argv) {
  var tle = getFile(argv.tlefilename)
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

      if (argv.immediate) options.range[0] = argv.now.toDate();
      
      return Object.assign(data, {
        pos: sattrack.visible(data.tle, options)
      });
    })
    .filter(x => x.pos)
    .toArray()
    .map(x => x.sort((a, b) => a.pos.time < b.pos.time ? -1 : 1))
    .subscribe(function (positions) {
      var limit = p => argv.limit ? p.slice(0,argv.limit) : p;
      // console.log(positions);
      limit(positions).forEach(function (data) {
        console.log(`${data.tle[0].trim()} visible at ${moment(data.pos.time).format('LT')} az:${data.pos.sat.az.toFixed(1)} alt:${data.pos.sat.alt.toFixed(1)}`);
      });
    });
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

/**
 * Download a TLE set from a url.
 * @param  {Object} argv An arguments object
 * @param  {String} argv.tleurl The url to download from
 * @param  {String} argv.tlefilename The filename to save the TLE set to
 * @return {Promise}      Returns a promise with no data.
 */
function getCelestrack(argv) {
  return HttpGet(argv.tleurl)
    .then(function (response) {
      
      if (argv.scraper) {
        response.body = argv.scraper(response.body);
      }
      
      fs.writeFileSync('./' + argv.tlefilename, response.body);
      console.log(chalk.green(`Updated ${argv.tlefilename}`));
      return response.body;
    })
    .catch(function (err) {
      console.error(chalk.red('error getting tle %s %s'), argv.tlefilename, argv.tleurl, err);
    });
}

/**
 * Scrape the nasa page for TLEs
 * @param  {String} body the body of the nasa response
 * @return {String}      a string of scraped TLEs
 */
function getNasa(body) {
  var search = [/Orbit ([^\)]*)/, /Vector Time \(GMT\): (.*)$/, /^....ISS$/, /.*/, /.*/];
  var sidx = 0;
  var tle = [];
  
  return body.split('\n').reduce(function(file, line) {
    var match = search[sidx].exec(line);
    if (match) {
      tle.push(match.slice(-1)[0].trim());
      sidx++;
      
      if (sidx >= search.length) {
        file.push(`${tle[2]} Orbit ${tle[0]} ${moment(tle[1], 'YYYY/DDD/HH:mm:ss.SSS').format('LLL')}
${tle[3]}
${tle[4]}`);
        tle = [];
        sidx = 0;
      }
    }
    return file;
  }, []).join('\n');
}

function getFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`TLE file '${file}' does not exist`);
  }
  var mtime = moment(fs.statSync(file).mtime);
  if (mtime.isBefore(moment().add(-2, 'days'))) {
    console.log(chalk.yellow(`TLE file ${file} is ${mtime.fromNow(true)} old.  You should update it.`));
  }

  return RxNode
    .fromReadLineStream(readline.createInterface({
      input: fs.createReadStream(file)
    }));
}

/**
 * Returns a TLE array given a string match or
 * regular expression string.
 * @param  {String}   file      Tile file to search
 * @param  {String}   satellite Search string or regex if in `//`
 * @param  {Function} cb        Optional callback: `function(err, tle)`
 * @return {Promise}            If no callback is passed in, a promise is returned
 */
function getTLE(file, satellite, cb) {
  // use a regular expression if the `satellite` string is
  // surrounded with `//`
  if (satellite.startsWith('/') && satellite.endsWith('/')) {
    var re = new RegExp(satellite.slice(1, -1), 'i');
    var match = x => !x.match(re);
  } else {
    var match = x => !x.startsWith(satellite); // eslint-disable-line no-redeclare
  }

  var observable = getFile(file)
    .skipWhile(function (x) {
      return match(x);
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