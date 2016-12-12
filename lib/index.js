'use strict';

var SGP4 = require('sgp4');
var SunCalc = require('suncalc');
// var chalk = require('chalk');
// var moment = require('moment');
var moment = require('moment-timezone');

var rtd = 57.29577951;

function tleStr2Arr(str) {
  return Array.isArray(str) ? str : str.split('\n').map(s => s.trim());
}

module.exports = {

  duskRange: function duskRange(date, location, before, after) {
    var times = SunCalc.getTimes(date, location.lat, location.lon);
    return [moment(times.dusk).add(before || -15, 'minutes'),
      moment(times.dusk).add(after || 120, 'minutes')
    ];
  },

  /**
   * Check to see if a satellite is visible.  A date range is passed in on the
   * `options` object.
   * @param  {string|array} tlestr  A TLE string or array.
   * @param  {object} options options object.
   * @param  {array} options.range array with date range in [0] and [1] positions.
   * @param  {number} options.minAlt minimum altitude to check for visiblity, default: 15.
   * @return {object}         object with sat results and time of first pass.
   */
  visible: function visible(tlestr, options) {
    var tle = tleStr2Arr(tlestr);

    var SatRec = SGP4.twoline2rv(tle[1], tle[2], SGP4.wgs84());
    var j = 0;
    // console.log('range', options.range.map(d => d.toLocaleString()), options.range.map(d => d.getTime()));
    for (var i = options.range[0].getTime(); i < options.range[1].getTime(); i += options.interval || 30000) {
      var t = new Date(i);
      // console.log('t', i, t);
      var sat = satData(SatRec, Object.assign(options, {
        now: t
      }));

      j++;

      if (sat.alt > (options.minAlt || 15)) {
        return {
          j: j,
          i: i,
          tle: tle,
          time: t,
          sat: sat
        };
      }
    }
  },

  predict: function predict(tlestr, options) {
    var tle = tleStr2Arr(tlestr);
    var now = moment();
    var SatRec = SGP4.twoline2rv(tle[1], tle[2], SGP4.wgs84());

    // var ff = f => f.toFixed(2); // format float to 2
    var beforeSunset, afterSunset;
    var future = 7 * 24 * 60 * 60;
    // console.log('future', future);
    for (var i = 0; i < future; i += 10) {
      var t = now.clone().add(i, 'second');
      // console.log(beforeSunset, now, beforeSunset && beforeSunset.isSame(t, 'day'));
      if (!beforeSunset || !beforeSunset.isSame(t, 'day')) {
        var times = SunCalc.getTimes(t.toDate(), options.location.lat, options.location.lon);
        beforeSunset = moment(times.dusk).add(-15, 'minutes');
        afterSunset = moment(times.dusk).add(2, 'hours');
        // console.log(`${i} ${beforeSunset.format('LLL z')} ${afterSunset.format('LLL z')}`)
      }

      var sat = satData(SatRec, Object.assign(options, {
        now: t.toDate()
      }));
      if (sat.alt > 15 && t.isBetween(beforeSunset, afterSunset)) {
        // console.log(`${i} ${t.format('MMMM Do, YYYY hh:mm:ss a z')} alt:${ff(sat.alt)} az:${ff(sat.az)}`);
        // break;
      }
    }

    var result = {
      // SatRec: SatRec,
      t: t.format('LLL z'),
      sat: sat
    };

    return result;
  }

};

function satData(satRec, options) {
  var positionAndVelocity = SGP4.propogate(satRec, options.now.getUTCFullYear(), options.now.getUTCMonth() + 1, options.now.getUTCDate(), options.now.getUTCHours(), options.now.getUTCMinutes(), options.now.getUTCSeconds());

  var gmst = SGP4.gstimeFromDate(options.now.getUTCFullYear(), options.now.getUTCMonth() + 1, options.now.getUTCDate(), options.now.getUTCHours(), options.now.getUTCMinutes(), options.now.getUTCSeconds());
  var geodeticCoordinates = SGP4.eciToGeodetic(positionAndVelocity.position, gmst);
  var longitude = SGP4.degreesLong(geodeticCoordinates.longitude);
  var latitude = SGP4.degreesLat(geodeticCoordinates.latitude);
  var hh = geodeticCoordinates.height;
  var r0 = 6378.135;
  var rr = hh + r0;
  var hzAng = Math.acos(r0 / rr) * rtd;
  var observerPos = {
    longitude: options.location.lon * SGP4.deg2rad,
    latitude: options.location.lat * SGP4.deg2rad,
    height: 1
  };
  var satEcf = SGP4.eciToEcf(positionAndVelocity.position, gmst);
  var lookAngles = SGP4.topocentricToLookAngles(SGP4.topocentric(observerPos, satEcf));
  var alt = lookAngles.elevation * SGP4.rad2deg;
  var az = lookAngles.azimuth * SGP4.rad2deg;
  return {
    latitude: latitude,
    longitude: longitude,
    hh: hh,
    gmst: gmst,
    alt: alt,
    az: az,
    hzAng: hzAng
  };
}
