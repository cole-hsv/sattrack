var SGP4 = require('sgp4');
var SunCalc = require('suncalc');
var chalk = require('chalk');
// Creates data for predicting ISS evening visibility from Huntsville

// Sample ISS TLE Data
var issLine1 = "1 25544U 98067A   16207.51310561  .00016717  00000-0  10270-3 0  9184";
var issLine2 = "2 25544  51.6412 226.8120 0001957  74.8988 285.2381 15.54915529 10947";
var spotISS = "time: Mon Jul 25 9:20 PM A, YES  ";

// ISS
//    1 25544U 98067A   16207.51310561  .00016717  00000-0  10270-3 0  9184
//    2 25544  51.6412 226.8120 0001957  74.8988 285.2381 15.54915529 10947

console.log(' ');
console.log(chalk.yellow('Start Prediction'));
// Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());
var tleYr = issSatRec.epochyr;
var tleDay = issSatRec.epochdays;
// console.log('issSatRec', issSatRec);
// console.log(issSatRec.epochyr, issSatRec.epochdays);

//  Observer location
var obsLat = 34.7; //                Huntsville lat, lng
var obsLng = -86.59;
printPosition(); // this runs the program

// This function is the main program and will print some info periodically
function printPosition() {
    var tyrc = 2016; // current year
    var tmonc = 7;
    var tdayc = 11;
    var thrsc = 20; // 20
    var tminc = 0;
    var tsecc = 0.0;
    var dt = 10;
    var recalc = 0;
    var ndays = 6; // number of days to calculate predictions
    var nn = 0;
    var minAdd = 0;

    // Examine ndays for satellite evening visibility
    for (i = 0; i < ndays; i++) {
        var tdayi = tdayc + i;

        //  find dusk
        var date1 = new Date(tyrc, tmonc, tdayi);
        var times = SunCalc.getTimes(date1, obsLat, obsLng);
        var duskHr = times.dusk.getHours();
        var duskMin = times.dusk.getMinutes();
        var duskSec = times.dusk.getUTCSeconds();
        var duskStr = timeString(duskHr - 12, duskMin, duskSec)

        var duskDf = duskHr + duskMin / 60; // dusk time in hour fractions
        thrsc = duskHr;
        tminc = duskMin + minAdd;

        // set start date with time at dusk plus adjustments for recalc.
        var duskp = new Date(tyrc, tmonc, tdayi, thrsc, tminc, tsecc);

        if (i == 0 && recalc == 0) { // print start date for first cycle only
            console.log(duskp);
            console.log('Estimate of time and longitude at observer latitude near dusk');
            console.log(' using the TLE for ', tleYr + 2000, '  day ', tleDay, '\n');
        };

        console.log('dusk', duskStr + ' PM');

        // get satellite data at observer latitude
        var vis = visdat(duskp);

        // set up adjustments for recalc to fix fly over before dusk, or super latitude issue
        if (recalc == 1) {
            recalc = 0;
            // tminc = 0;
            minAdd = 0;
        };
        // recalculate to fix a super latitude issue, delay start time by 5 minutes.
        //   For an oblate earth the actual satellite latitude can exceed orbit inclination.
        var ablats = Math.abs(vis.lats);
        if (ablats > vis.incs) { //
            console.log('SuperLat', tmonc, tdayi, thrsc, tminc, vis.lats, vis.incs);
            i--;
            minAdd = 5;
            recalc = 1;
        };

        // print estimate of sat time and longitude at observer latitude crossing
        var sVis = satVis(duskp, vis.velz, vis.orbPeriod, vis.inc0, vis.latitude, vis.longitude, obsLat, obsLng);
        var tObs1 = sVis.tObs1;
        console.log(sVis.text1);
        console.log(sVis.text2);

        //  recalculate for too early pass, where observer fly over occurs before dusk'
        //    by delaying start time by 35 minutes.
        if (tObs1 < duskDf) { //
            console.log('too early');
            i--;
            minAdd = 35
            recalc = 1
        }
        console.log(' ');
        nn++;
        if (nn > ndays + 4) {
            break
        };
    };
};

// find satellite location and orbit data at dusk, using SGP4 code
function visdat(now) {
    var rtd = 57.29577951; //                     degrees per radian
    var positionAndVelocity = SGP4.propogate(issSatRec, now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    var gmst = SGP4.gstimeFromDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    var geodeticCoordinates = SGP4.eciToGeodetic(positionAndVelocity.position, gmst);
    var longitude = SGP4.degreesLong(geodeticCoordinates.longitude);
    var latitude = SGP4.degreesLat(geodeticCoordinates.latitude);
    var lats = Math.round(latitude * 1000) / 1000;
    var inc0 = issSatRec.inclo; // radians
    var incs = Math.round(inc0 * rtd * 1000) / 1000;
    var hh = geodeticCoordinates.height;
    var rr = hh + 6378.135;
    var orbPeriod = ((2 * Math.PI) * rr) * (Math.sqrt((rr) / 398600.8)) / 60;
    var velz = positionAndVelocity.velocity.z;
    return {
        velz: velz,
        orbPeriod: orbPeriod,
        inc0: inc0,
        latitude: latitude,
        longitude: longitude,
        lats: lats,
        incs: incs,
        hh: hh
    };
};

function satVis(nowv, velz, orbP, incB, latb0, lng0, latObs, lngObs) {
    // Estimate time and longitude when satellite crosses observer latitude,
    //   for both an ascending and a descending pass, using satellite data at dusk,
    //   using Napier's rules for spherical triangles.
    var ti = (nowv.getHours() + (nowv.getMinutes() + nowv.getUTCSeconds() / 60) / 60) / 24;
    var rtd = 57.29577951; //                     degrees per radian
    var mpd = 1440; //                            minutes per day
    var er = 0.25; //                             earth rate, deg/min
    var hP = orbP / 2; //                         half orbit period
    var nn = orbP / 360; //                       mean motion, minutes/deg
    var b0 = latb0; //                            satellite latitude, deg
    var b1 = latObs; //                           observer latitude, deg
    var qq = Math.sign(velz); //                  asc/descending orbit (1/-1),
    var sB = Math.sin(incB);
    var cB = Math.cos(incB);
    var tB = Math.tan(incB);
    var tb0 = Math.tan(b0 / rtd);
    var tb1 = Math.tan(b1 / rtd);
    var sb0 = Math.sin(latb0 / rtd);
    var sb1 = Math.sin(latObs / rtd);
    var cb1 = Math.cos(latObs / rtd);
    var c0 = Math.asin(sb0 / sB) * rtd * qq; // orbit segment, node to ISS
    var c1 = Math.asin(sb1 / sB) * rtd * qq; // orbit segment, node to Obs Lat
    var dc = c1 - c0; //                        orbit segment, ISS to Obs Lat
    var t0 = c0 * nn; //                        time from node to ISS
    var t1 = c1 * nn; //                        time from node to Obs Lat
    var tnn = hP - t0; //                       time from ISS to next node
    var dt = dc * nn; //                        time delta, ISS to Obs Lat
    var tObs = ti + dt / mpd; //                estimated clock time at Obs Lat, day fraction
    var tObsHr = Math.floor(tObs * 24);
    var tObsMin = Math.floor((tObs * 24 - tObsHr) * 60);
    var tObsSec = Math.floor(((tObs * 24 - tObsHr) * 60 - tObsMin) * 60);
    var tnode = ti - t0 / mpd; //               node clock time est
    var tNnode = tnode + hP / mpd; //           next node clock time est
    var tNObs = tNnode - t1 / mpd; //           next Obs Lat clock time est
    var tNObsHr = Math.floor(tNObs * 24);
    var tNObsMin = Math.floor((tNObs * 24 - tNObsHr) * 60);
    var tNObsSec = Math.floor(((tNObs * 24 - tNObsHr) * 60 - tNObsMin) * 60);
    var a0 = Math.asin(tb0 / tB) * rtd; //      Longitude segment, node to ISS
    var a1 = Math.asin(tb1 / tB) * rtd; //      Longitude segment, node to Obs Lat
    var da = a1 - a0; //                        Longitude segment, ISS to Obs Lat
    var de = er * dt; //                        earth rotation angle, ISS to obs
    var lng1 = angle2(lng0 + da * qq - de); //          estimate of ISS longitude at Obs Lat
    var lng1s = lng1.toFixed(3);
    var lngN = lng0 - a0 * qq + t0 * er; //     estimate of node longitude
    var lngNN = angle2(lngN + 180 - er * hP); //        estimate of Longitude of next node
    var lng2 = angle2(lngNN - a1 * qq + t1 * er); //  est of ISS longitude at next Obs Lat
    var lng2s = lng2.toFixed(3);
    var t0nn = t0 + tnn; //                     time node to node
    var aolc = Math.asin(cB / cb1) * rtd; //    orbit crossing angle at Obs Lat
    var dlng1 = lngObs - lng1; //                sat to obs lng diff at crossing1
    var dlng2 = lngObs - lng2; //               sat to obs lng diff at crossing2
    var dlngLim = 14; //                       deg lontitude visibility limit
    //  The value 14 was determined by trial and error specifically for ISS data
    //    and Huntsville Latitude, needs an analytical basis, TBD.
    var ck1 = (Math.abs(dlng1) < dlngLim); //        visibility check 1
    var ck2 = (Math.abs(dlng2) < dlngLim); //        visibility check 2
    var tyrc = nowv.getUTCFullYear();
    var tmonc = nowv.getUTCMonth();
    var tdayc = nowv.getUTCDate();
    // find satellite sun angle when crossing obs latitude
    var dateX1 = crossTime(nowv, tObsHr, tObsMin, tObsSec);
    var dateX2 = crossTime(nowv, tNObsHr, tNObsMin, tNObsSec);
    var sunCurPos = SunCalc.getPosition(dateX1, latObs, lng1);
    var sunAz1 = sunCurPos.azimuth * rtd;
    var sunAlt1 = sunCurPos.altitude * rtd + 19.8;
    var sunCurPos = SunCalc.getPosition(dateX2, latObs, lng2);
    var sunAz2 = sunCurPos.azimuth * rtd;
    var sunAlt2 = sunCurPos.altitude * rtd + 19.8;
    var satx1 = ' SatSunAng ' + sunAlt1.toFixed(2);
    var satx2 = ' SatSunAng ' + sunAlt2.toFixed(2);
    if (ck1 == 0) {
        satx1 = ''
    };
    if (ck2 == 0) {
        satx2 = ''
    };
    // prepare text for output
    var svtx1 = timeTxx(nowv, tObsHr, tObsMin, qq, ck1);
    var svtx2 = timeTxx(nowv, tNObsHr, tNObsMin, -qq, ck2);
    var sxtx1 = svtx1 + '\t lng1 ' + lng1s + ' ' + satx1;
    var sxtx2 = svtx2 + '\t lng2 ' + lng2s + ' ' + satx2;

    return {
        tObs1: tObs * 24, //                        hours
        text1: sxtx1,
        text2: sxtx2
    }
};

// format latitude crossing time into standard js date.
function crossTime(nowz, tzHr, tzMin, tzSec) {
    var tzyr = nowz.getUTCFullYear();
    var tzmon = nowz.getUTCMonth();
    var tzday = nowz.getUTCDate() - 1;
    var date2 = new Date(tzyr, tzmon, tzday, tzHr, tzMin, tzSec);
    return date2;
};

//   create date and time text for use in pll.js
function timeTxx(nowx, thr, tmin, qq, ck) { //   create date and time text for pll.js
    var ttx1 = 'time: ' + nowx;
    if (tmin < 10) {
        tmin = '0' + tmin
    };
    qtx = ' Asc';
    if (qq < 0) {
        qtx = ' Des';
    };
    var vis = ' NO';
    if (ck == 1) {
        vis = 'YES';
    };
    var ttx2 = ttx1.substring(0, 17) + (thr - 12) + ':' + tmin + ' PM ' + qtx + ', ' + vis;
    return ttx2;
};

function timeString(hr, mn, sc) {
    if (mn < 10) {
        mn = '0' + mn
    };
    if (sc < 10) {
        sc = '0' + sc
    };
    ts = hr + ':' + mn + ':' + sc;
    return ts;
}


//  fix angle between -180 to 180 deg
function angle2(ang) {
    while (ang > 180) {
        ang = ang - 360;
    };
    while (ang < -180) {
        ang = ang + 360;
    };
    return (ang);
};
