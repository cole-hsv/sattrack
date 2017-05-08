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

var sattrack = {

  duskRange: function duskRange(date, location, before, after) {
    var times = SunCalc.getTimes(date, location.latitude, location.longitude);
    return [moment(times.dusk).add(before || -15, 'minutes'),
      moment(times.dusk).add(after || 120, 'minutes')
    ];
  },

  range: function range(tlestr, options, check, done) {
    var tle = tleStr2Arr(tlestr);

    var SatRec = SGP4.twoline2rv(tle[1], tle[2], SGP4.wgs84());
    var j = 0;
    var lastpos, lastcheck;
    // console.log('range', options.range.map(d => d.toLocaleString()), options.range.map(d => d.getTime()));
    for (var i = options.range[0].getTime(); i < options.range[1].getTime(); i += options.interval || 30000) {
      var t = new Date(i);
      // console.log('t', i, t);
      var sat = satData(SatRec, Object.assign(options, {
        now: t
      }));

      j++;
      lastpos = {
        j: j,
        i: i,
        tle: tle,
        time: t,
        sat: sat
      };
      lastcheck = check(lastpos);
      
      if (lastcheck) {
        break;
      }
    }

    if (done) done(lastpos, lastcheck);
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
    var result;
    var minAlt = (options.minAlt || 15);
    sattrack.range(tle, options, function check(pos) {
      return pos.sat.alt > minAlt;
    }, function done(pos, visible) {
      if (visible) {
        result = pos;
      }
    });
    return result;
  },
  
  /**
   * Convert Alt/Az to Ra/Dec
   * @param  {Number} gmst Theta0
   * @param  {Number} alt  Altitude of object
   * @param  {Number} az   azimuth of object
   * @param  {Number} lat  Latitude of observer
   * @param  {Number} lon  Longitude of observer
   * @return {Object}      Object with ra/dec
   */
  AltAz2RaDec: function(gmst, alt, az, lat, lon) {
    return AltAz2RaDec(gmst, alt, az, lat, lon);
  },
  
  AltAz2RaDecDeg: function(gmst, alt, az, lat, lon) {
    var rtd = 57.29577951;
    return AltAz2RaDec(gmst * rtd, alt, az, lat, lon);
  }
};

function AltAz2RaDec(th0, alt, az, latObs, lngObs) {
    // Converts alt/az to Ra/Dc in degrees
    // th0 is sidereal angle in degrees
    // az is azimuth measured East from North in degrees
    // longitude is negative West in degrees
  var azr = az / rtd;
  var elr = alt / rtd;
  var latr = latObs / rtd;
  var saz = Math.sin(azr);
  var caz = Math.cos(azr);
  var se = Math.sin(elr);
  var ce = Math.cos(elr);
  var slat = Math.sin(latr);
  var clat = Math.cos(latr);
  var sdec = slat * se + clat * ce * caz;
  var decr = Math.asin(sdec);
  var cdec = Math.cos(decr);
  var dec = decr * rtd;
  var cH = (se - sdec * slat) / (cdec * clat);
  var H = Math.acos(cH) * rtd; //                degrees
  if (saz > 0) {
    H = 360 - H;
  }
  var ra = th0 + lngObs - H;
  if (ra < 0) {
    ra = ra + 360;
  }
  return {
    ra: ra,
    dec: dec
  };
}

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
    longitude: options.location.longitude * SGP4.deg2rad,
    latitude: options.location.latitude * SGP4.deg2rad,
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

module.exports = sattrack;