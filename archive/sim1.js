var SGP4 = require('sgp4');
var SunCalc = require('suncalc');
var chalk = require('chalk');
//var moment = require('moment');
var moment = require('moment-timezone');
// Create data for plotting ISS TLE lat-Long for Spot ISS date and time, 30 sec intervals

// Sample ISS TLE Data
var issLine1 = "1 25544U 98067A   16228.46489348  .00016717  00000-0  10270-3 0  9035";
var issLine2 = "2 25544  51.6431 122.2483 0001572 125.1874 234.9426 15.55014495 14203";
var spotISS = "Time: Mon Aug 15 8:34 PM, Visible: 3 min, Max Height: 58°, Appears: 23° above NNW, Disappears: 25° above ESE";

// ISS
//     1 25544U 98067A   16228.46489348  .00016717  00000-0  10270-3 0  9035
//     2 25544  51.6431 122.2483 0001572 125.1874 234.9426 15.55014495 14203
// Time: Mon Aug 15 8:34 PM, Visible: 3 min, Max Height: 58°, Appears: 23° above NNW, Disappears: 25° above ESE

var today = moment().format("ddd MMM DD, YYYY h:mm A CT");
console.log(' ');
console.log(chalk.yellow('Satellite Simulation Data   ', today));
// Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());
// console.log('SPG4.wgs84()', SGP4.wgs84());
//  console.log('issSatRec', issSatRec);
var obsLat = 34.6233; //        Huntsville lat, lng, (Joe Davis Stadium 34.7, -86.59)
var obsLng = -86.5364;
// var obsLat = 34.6233; //         Huntsville lat, lng, (Aldersgate Meth. Ch. 34.6233, -86.5364)
// var obsLng = -86.5364;
var r0 = 6378.135;
var rtd = 57.29577951;

var tyr = 2016; //            issSatRec.epochyr + 2000;
//                            var txmon = spotISS.substring(10, 13);
var tmon = 7;
var tday = 14; //            spotISS.substring(14, 16);
var thr = 21; //             Number(spotISS.substring(17, 18)) + 12;
var tmin = 26 + 0; //        Number(spotISS.substring(19, 21)) + 2;
var tsec0 = 30;
var dt = 30;

// var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// var tmon = months.indexOf(txmon);
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

        var satD = satData(now);

        var sunCurPos = SunCalc.getPosition(now, satD.latitude, satD.longitude);
        var sunAz = sunCurPos.azimuth * rtd;
        var sunAz2 = sunAz.toFixed(2);
        var sunAng = sunCurPos.altitude * rtd + satD.hzAng;

        if (i < 1) {
            var times = SunCalc.getTimes(now, obsLat, obsLng);

            var duskStr = moment(times.dusk).format("h:mm:ss A");
            console.log(now);
            console.log('Dusk ' + duskStr + '\t\tHeight (Km) \t' + satD.hh.toFixed(3) + '\t\tHzAng\t ' + satD.hzAng.toFixed(3) + '° \n');
            console.log("time hms \tLat ° \t Long° \tAlt ° \t Az ° \tSunAl° \tSunAzS°\t Ra ° \tDec °"); // column labels
        };

        var aa2rd = AltAz2RaDec(satD.gmst * rtd, satD.alt, satD.az, obsLat, obsLng);

        var tnow = moment(now).format("h:mm:ss A");
        // var prtT = new Date();
        // var ms = prtT.getMilliseconds();
        console.log(textPosition(tnow, satD.latitude, satD.longitude, satD.alt, satD.az, sunAng, sunAz2, aa2rd.ra, aa2rd.dec));
    };
};

function textPosition(tnow1, lat1, lng1, alt1, az1, sunAng, sunAz2, ra1, dec1) {
    var lat1s = lat1.toFixed(2);
    var lng1s = lng1.toFixed(2);
    var alt1s = alt1.toFixed(2);
    var sang = sunAng.toFixed(3);
    var az1s = az1.toFixed(2);
    var ra1s = ra1.toFixed(2);
    var dec1s = dec1.toFixed(2);

    tx = tnow1 + '\t' + lat1s + '\t' + lng1s + '\t' + alt1s + '\t' + az1s + '\t' + sang + '\t' + sunAz2 + '\t' + ra1s + '\t' + dec1s;
    return tx
};

function satData(now) {

    var positionAndVelocity = SGP4.propogate(issSatRec, now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    var gmst = SGP4.gstimeFromDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    var geodeticCoordinates = SGP4.eciToGeodetic(positionAndVelocity.position, gmst);
    var longitude = SGP4.degreesLong(geodeticCoordinates.longitude);
    var latitude = SGP4.degreesLat(geodeticCoordinates.latitude);
    var lats = Math.round(latitude * 1000) / 1000;
    var inc0 = issSatRec.inclo; // radians
    var incs = Math.round(inc0 * rtd * 1000) / 1000;
    var hh = geodeticCoordinates.height;
    var r0 = 6378.135;
    var rr = hh + r0;
    var orbPeriod = ((2 * Math.PI) * rr) * (Math.sqrt((rr) / 398600.8)) / 60;
    var velz = positionAndVelocity.velocity.z;
    var rr = hh + r0;
    var hzAng = Math.acos(r0 / rr) * rtd;
    var observerPos = {
        longitude: obsLng * SGP4.deg2rad,
        latitude: obsLat * SGP4.deg2rad,
        height: 1
    };
    var satEcf = SGP4.eciToEcf(positionAndVelocity.position, gmst);
    var lookAngles = SGP4.topocentricToLookAngles(SGP4.topocentric(observerPos, satEcf));
    alt = lookAngles.elevation * SGP4.rad2deg;
    az = lookAngles.azimuth * SGP4.rad2deg;
    return {
        latitude: latitude,
        longitude: longitude,
        hh: hh,
        gmst: gmst,
        alt: alt,
        az: az,
        hzAng: hzAng
    };
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
