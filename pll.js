var SGP4 = require('sgp4');
var SunCalc = require('suncalc');
var chalk = require('chalk');
// Create data for plotting ISS TLE lat-Long for Spot ISS date and time, 30 sec intervals

// Sample ISS TLE Data
var issLine1 = "1 25544U 98067A   16207.51310561  .00016717  00000-0  10270-3 0  9184";
var issLine2 = "2 25544  51.6412 226.8120 0001957  74.8988 285.2381 15.54915529 10947";
var spotISS = "time: Mon Jul 25 9:20 PM A, YES";

//     1 25544U 98067A   16167.59728769  .00016717  00000-0  10270-3 0  9034
//     2 25544  51.6442  65.9684 0000440 321.4350  38.6771 15.54542539  4737
// Time: Wed Jun 15 8:39 PM, Visible: 4 min, Max Height: 42°, Appears: 26° above NNW, Disappears: 10° above ESE


console.log(' ');
console.log(chalk.yellow('Satellite Plot Data'));
// Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());
// console.log('SPG4.wgs84()', SGP4.wgs84());
//  console.log('issSatRec', issSatRec);
var obsLat = 34.7; //                Huntsville lat, lng
var obsLng = -86.59;
var r0 = 6378.135;
var rtd = 57.29577951
var tyr = issSatRec.epochyr + 2000;
var txmon = spotISS.substring(10, 13);
var tday = spotISS.substring(14, 16);
var thr = Number(spotISS.substring(17, 18)) + 12;
var tmin = Number(spotISS.substring(19, 21)) + 0;
var tsec0 = 37;

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
    for (i = 0; i < 14; i++) {
        var tsec = tsec0 + 30 * i;
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
            }
            var duskSec = times.dusk.getUTCSeconds();
            if (duskSec < 10) {
                duskSec = "0" + duskSec;
            }
            var duskStr = (duskHr - 12) + ':' + duskMin + ':' + duskSec + ' PM';

            console.log(now);
            console.log('Dusk ' + duskStr + '\t\tHeight (Km) \t' + hh.toFixed(3));
            console.log("time hms \tLat ° \t Long° \tAlt ° \tAz ° \tSunAng°"); // column labels
        };

        // Prints latitude of longitude of ISS
        var nHrs = now.getHours();
        var nMin = now.getMinutes();
        var nSec = now.getUTCSeconds();
        console.log(textPosition(nHrs, nMin, nSec, latitude, longitude, alt, az, sunAng));
    };
};

function textPosition(hrs1, min1, sec1, lat1, lng1, alt1, az1, sunAng) {
    var lat1s = lat1.toFixed(2);
    var lng1s = lng1.toFixed(2);
    var alt1s = alt1.toFixed(2);
    var sang = sunAng.toFixed(3);
    var az1s = az1.toFixed(2);
    if (min1 < 10) {
        min1 = "0" + min1;
    };
    if (sec1 < 10) {
        sec1 = "0" + sec1;
    };
    tx = hrs1 + ':' + min1 + ':' + sec1 + '\t' + lat1s + '\t' + lng1s + '\t' + alt1s + '\t' + az1s + '\t' + sang;
    return tx
};
