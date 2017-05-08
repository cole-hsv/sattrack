var SGP4 = require('sgp4');
var SunCalc = require('suncalc');
var chalk = require('chalk');
//var moment = require('moment');
var moment = require('moment-timezone');
// Create data for plotting ISS TLE lat-Long for Spot ISS date and time, 30 sec intervals

// Sample ISS TLE Data
var issLine1 = "1 25544U 98067A   16209.50561190  .00016717  00000-0  10270-3 0  9002";
var issLine2 = "2 25544  51.6406 216.8707 0002047  79.2092 280.9291 15.54896772 11251";
var spotISS = "time: Thu Jul 28 8:17 PM A, YES";

//     1 25544U 98067A   16209.50561190  .00016717  00000-0  10270-3 0  9002
//     2 25544  51.6406 216.8707 0002047  79.2092 280.9291 15.54896772 11251
// Time: Wed Jul 27 9:10 PM, Visible: 6 min, Max Height: 46°, Appears: 10° above WSW, Disappears: 11° above NE

var today = moment().format("ddd MMM DD, YYYY h:mm A CT");
console.log(' ');
console.log(chalk.yellow('Satellite Simulation Data   ', today));
// Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());
// console.log('SPG4.wgs84()', SGP4.wgs84());
//  console.log('issSatRec', issSatRec);
// var obsLat = 34.7; //        Huntsville lat, lng, (Joe Davis Stadium 34.7, -86.59)
// var obsLng = -86.59;
var obsLat = 34.6233; //         Huntsville lat, lng, (Aldersgate Meth. Ch. 34.6233, -86.5364)
var obsLng = -86.5364;
var r0 = 6378.135;
var rtd = 57.29577951;
var tyr = issSatRec.epochyr + 2000;
var txmon = spotISS.substring(10, 13);
var tday = spotISS.substring(14, 16);
var thr = Number(spotISS.substring(17, 18)) + 12;
var tmin = Number(spotISS.substring(19, 21)) + 2;
var tsec0 = 26;
var dt = 30;

var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var tmon = months.indexOf(txmon);
// console.log(tyr, tmon, txmon, tday, thr, tmin);
var tspot = new Date(tyr, tmon, tday, thr, tmin);
// console.log('tspot', tspot);
//console.log(spotISS);
console.log('ISS TLE', '\n\t', issLine1, '\n\t', issLine2);
// console.log('\t', issLine2);
printPosition();
console.log(' ');

// This will print some info periodically
function printPosition() {
    var i;
    for (i = 0; i < 14; i++) {
        var tsec = tsec0 + dt * i;
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
        var sunAz2 = sunAz.toFixed(2);
        var sunAng = sunCurPos.altitude * rtd + hzAng;

        if (i < 1) {
            var times = SunCalc.getTimes(now, obsLat, obsLng);
            // var duskHr = times.dusk.getHours();
            // var duskMin = times.dusk.getMinutes();
            // var duskSec = times.dusk.getUTCSeconds();
            // var duskStr = (duskHr - 12) + ':' + duskMin + ':' + duskSec + ' PM';

            var duskStr = moment(times.dusk).format("h:mm:ss A");
            console.log(now);
            console.log('Dusk ' + duskStr + '\t\tHeight (Km) \t' + hh.toFixed(3) + '\t\tHzAng\t ' + hzAng.toFixed(3) + '° \n');
            console.log("time hms \tLat ° \t Long° \tAlt ° \t Az ° \tSunAl° \tSunAzS°\t Ra ° \tDec ° \t ms"); // column labels
        };

        var aa2rd = AltAz2RaDec(gmst * rtd, alt, az, obsLat, obsLng);
        // Prints latitude of longitude of ISS
        var nHrs = now.getHours();
        var nMin = now.getMinutes();
        var nSec = now.getUTCSeconds();
        var prtT = new Date();
        var ms = prtT.getMilliseconds()
        console.log(textPosition(nHrs, nMin, nSec, latitude, longitude, alt, az, sunAng, sunAz2, aa2rd.ra, aa2rd.dec, ms));
    };
};

function textPosition(hrs1, min1, sec1, lat1, lng1, alt1, az1, sunAng, sunAz2, ra1, dec1, ms1) {
    var lat1s = lat1.toFixed(2);
    var lng1s = lng1.toFixed(2);
    var alt1s = alt1.toFixed(2);
    var sang = sunAng.toFixed(3);
    var az1s = az1.toFixed(2);
    var ra1s = ra1.toFixed(2);
    var dec1s = dec1.toFixed(2);
    if (min1 < 10) {
        min1 = "0" + min1;
    };
    if (sec1 < 10) {
        sec1 = "0" + sec1;
    };
    tx = hrs1 + ':' + min1 + ':' + sec1 + '\t' + lat1s + '\t' + lng1s + '\t' + alt1s + '\t' + az1s + '\t' + sang + '\t' + sunAz2 + '\t' + ra1s + '\t' + dec1s + '\t' + ms1;
    return tx
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
        H = 360 - H
    };
    var ra = th0 + lngObs - H;
    if (ra < 0) {
        ra = ra + 360
    };
    return {
        ra: ra,
        dec: dec
    };
};

// Sub AltAz2RaDec(Jd, alt, az, LatObs, LngObs, ra, dec)
// '   for Sheet 11
// '   Jd is Julian date with time as a day fraction
// '   az is azimuth measured East from North
// '   longitude is negative West
// '   functions required:  Thet0, Angle1
//     th0 = Thet0(Jd)
//     saz = Sin(az / rtd)
//     caz = Cos(az / rtd)
//     se = Sin(alt / rtd)
//     ce = Cos(alt / rtd)
//     slat = Sin(LatObs / rtd)
//     clat = Cos(LatObs / rtd)
//     sdec = slat * se + clat * ce * caz
//     dec = Application.Asin(sdec) * rtd
//     cdec = Cos(dec / rtd)
//     cH = (se - sdec * slat) / (cdec * clat)
//     H = Application.Acos(cH) * rtd
//     If saz > 0 Then H = 360 - H
//     L = LngObs
//     ra = th0 + L - H
//     If ra < 0 Then ra = ra + 360
// End Sub
