var SGP4 = require('sgp4');
var SunCalc = require('suncalc');
var chalk = require('chalk');
var moment = require('moment-timezone');
// https://github.com/cole-hsv/sattrack

// Create data for plotting ISS TLE lat-Long for Spot ISS date and time, 30 sec intervals

// Sample ISS TLE Data
var issLine1 = "1 25544U 98067A   16228.46489348  .00016717  00000-0  10270-3 0  9035";
var issLine2 = "2 25544  51.6431 122.2483 0001572 125.1874 234.9426 15.55014495 14203";
var spotISS = "time: Thu Aug 19 8:15 PM  Des, YES";

//     1 25544U 98067A   16167.59728769  .00016717  00000-0  10270-3 0  9034
//     2 25544  51.6442  65.9684 0000440 321.4350  38.6771 15.54542539  4737
// Time: Wed Jun 15 8:39 PM, Visible: 4 min, Max Height: 42°, Appears: 26° above NNW, Disappears: 10° above ESE


console.log(' ');
console.log(chalk.yellow('Satellite Plot Data'));
// Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());
// console.log('SPG4.wgs84()', SGP4.wgs84());
//  console.log('issSatRec', issSatRec);
// initialize Arrays
var altA = [];
var timeA = [];

// set observer location and other constants
// var obsLat = 34.7; //                Huntsville lat, lng, (Joe Davis Stadium 34.7, -86.59)
// var obsLng = -86.59;
var obsLat = 34.6233; //         Huntsville lat, lng, (Aldersgate Meth. Ch. 34.6233, -86.5364)
var obsLng = -86.5364;
var r0 = 6378.135;
var rtd = 57.29577951
var tyr = issSatRec.epochyr + 2000;
var txmon = spotISS.substring(10, 13);
var tday = spotISS.substring(14, 16);
var thr = Number(spotISS.substring(17, 18)) + 12;
var tmin = Number(spotISS.substring(19, 21)) - 0;
var tsec0 = 10;

var dsec = 30;
var nPts = 14;

var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var tmon = months.indexOf(txmon);
// console.log(tyr, tmon, txmon, tday, thr, tmin);
var tspot = new Date(tyr, tmon, tday, thr, tmin);
// console.log('tspot', tspot);
console.log(spotISS);
console.log('ISS TLE', '\t', issLine1);
console.log('\t', issLine2);
printPosition();
console.log(' ');

// This will print some info periodically
function printPosition() {
    var i;
    for (i = 0; i < nPts; i++) {
        var tsec = tsec0 + dsec * i;
        var now = new Date(tyr, tmon, tday, thr, tmin, tsec);

        // This will contain ECI (http://en.wikipedia.org/wiki/Earth-centered_inertial) coordinates of position and velocity of the satellite
        var positionAndVelocity = SGP4.propogate(issSatRec, now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        var gmst = SGP4.gstimeFromDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        // Geodetic coordinates
        var geodeticCoordinates = SGP4.eciToGeodetic(positionAndVelocity.position, gmst);
        // Coordinates in degrees
        var longitude = SGP4.degreesLong(geodeticCoordinates.longitude);
        var latitude = SGP4.degreesLat(geodeticCoordinates.latitude);
        var hh = geodeticCoordinates.height;
        var rr = hh + r0;
        var hzAng = Math.acos(r0 / rr) * rtd;
        var tstephr = now.getUTCHours();

        // console.log(tstephr, + ':' + now.getUTCMinutes() + ":" + now.getUTCSeconds() + '\t' + latitude + '\t' + longitude);
        var observerPos = {
            longitude: obsLng * SGP4.deg2rad,
            latitude: obsLat * SGP4.deg2rad,
            height: 1
        };
        var satEcf = SGP4.eciToEcf(positionAndVelocity.position, gmst);
        var lookAngles = SGP4.topocentricToLookAngles(SGP4.topocentric(observerPos, satEcf));
        alt = lookAngles.elevation * SGP4.rad2deg;
        az = lookAngles.azimuth * SGP4.rad2deg;
        // console.log("Azimuth: " + lookAngles.azimuth * SGP4.rad2deg);
        // console.log("Elevation: " + lookAngles.elevation * SGP4.rad2deg);

        var sunCurPos = SunCalc.getPosition(now, latitude, longitude);
        var sunAz = sunCurPos.azimuth * rtd;
        var sunAng = sunCurPos.altitude * rtd + hzAng;

        if (i < 1) {
            var times = SunCalc.getTimes(now, obsLat, obsLng);
            var duskHr = times.dusk.getHours();
            var duskMin = times.dusk.getMinutes();
            if (duskMin < 10) {
                duskMin = "0" + duskMin;
            };
            var duskSec = times.dusk.getUTCSeconds();
            if (duskSec < 10) {
                duskSec = "0" + duskSec;
            };
            var duskStr = (duskHr - 12) + ':' + duskMin + ':' + duskSec + ' PM';

            console.log(now);
            console.log('Dusk ' + duskStr + '\t\tHeight (Km) \t' + hh.toFixed(3));
            console.log("time hms \tLat ° \t Long° \tAlt ° \tAz ° \tSunAng°"); // column labels
        };

        // fill Arrays
        altA.push(alt);
        timeA.push(now);

        // Prints latitude of longitude of ISS
        var tnow = moment(now).format("h:mm:ss A");
        var nHrs = now.getHours();
        var nMin = now.getMinutes();
        var nSec = now.getUTCSeconds();
        console.log(textPosition(tnow, latitude, longitude, alt, az, sunAng));
    };
    var dAlt = ((15 - altA[0]) / (altA[1] - altA[0]) * dsec).toFixed(2);
    // var altMx = altA[0];
    // for (i = 1; i < nPts; i++) {
    //     if (altA[i] > altMx) {
    //         altMx = altA[i];
    //     };
    // };

    altMax1 = altitudeMax(altA);

    console.log("riseAdj ", dAlt, "\t\tmaxAlt ", altMax1.toFixed(3));
    //  console.log("riseAdj ", dAlt, "\tmaxAlt ", altMx.toFixed(2), altMax1.toFixed(3));
};

function textPosition(tnow1, lat1, lng1, alt1, az1, sunAng) {
    var lat1s = lat1.toFixed(2);
    var lng1s = lng1.toFixed(2);
    var alt1s = alt1.toFixed(2);
    var sang = sunAng.toFixed(3);
    var az1s = az1.toFixed(2);
    tx = tnow1 + '\t' + lat1s + '\t' + lng1s + '\t' + alt1s + '\t' + az1s + '\t' + sang;
    return tx
};

function altitudeMax(altA1) {
    // uses 3 point Langrangian interpolation to find max
    var altMax = altA1[0];
    for (i = 1; i < nPts; i++) {
        if (altA1[i] > altMax) {
            altMax = altA1[i];
            x2 = i
        };
    };
    x1 = x2 - 1;
    x3 = x2 + 1;
    y1 = altA1[x1];
    y2 = altA1[x2];
    y3 = altA1[x3];
    a1 = x2 + x3;
    a2 = x1 + x3;
    a3 = x1 + x2;
    b1 = (x1 - x2) * (x1 - x3);
    b2 = (x2 - x1) * (x2 - x3);
    b3 = (x3 - x1) * (x3 - x2);
    c1 = y1 * a1 / b1 + y2 * a2 / b2 + y3 * a3 / b3;
    c2 = (y1 / b1 + y2 / b2 + y3 / b3) * 2;
    x = c1 / c2;
    e1 = x - x1;
    e2 = x - x2;
    e3 = x - x3;
    b1 = (x1 - x2) * (x1 - x3);
    b2 = (x2 - x1) * (x2 - x3);
    b3 = (x3 - x1) * (x3 - x2);
    y = y1 * e2 * e3 / b1 + y2 * e1 * e3 / b2 + y3 * e1 * e2 / b3;
    return y
};
