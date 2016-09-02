var SGP4 = require('sgp4');
var SunCalc = require('suncalc');
var chalk = require('chalk');
var moment = require('moment-timezone');
// Creates data for predicting ISS evening visibility from Huntsville
// May work for other near circular orbit satellites, not yet tested

// Sample ISS TLE Data
var issLine1 = "1 25544U 98067A   16258.87296899  .00016717  00000-0  10270-3 0  9197";
var issLine2 = "2 25544  51.6423 330.5895 0005293 304.7575  55.3079 15.53798175 18937";
var spotISS = "time: Sat Sep 14 8:47 PM  Des, YES";

// ISS
// 1 25544U 98067A   16258.87296899  .00016717  00000-0  10270-3 0  9197
// 2 25544  51.6423 330.5895 0005293 304.7575  55.3079 15.53798175 18937

var today = moment().format("ddd MMM DD, YYYY h:mm A CT");
console.log(' ');
console.log(chalk.yellow('Start Prediction   ' + today));

//  Observer location and other constants
var obsLat = 34.7; //                Huntsville lat, lng
var obsLng = -86.59;
var altHz = 15; //              altitude angle of effective horizon
var rtd = 180 / Math.PI; //            degrees per radian
var r0 = 6378.135; //        earth equatorial radius, km
var kmpLngDeg = r0 * Math.cos(obsLat / rtd) / rtd; //  km per lng degree at obs lat
// Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());
var tleYr = issSatRec.epochyr;
var tleDay = issSatRec.epochdays;
var inclo = issSatRec.inclo; // inclination in radians
var incld = inclo * rtd;

var tyrc = 2016; // current year
var tmonc = 8; // desired month minus one
var tdayc = 25;
var thrsc = 20; // 20
var tminc = 0;
var tsecc = 0.0;
var ndays = 5; // number of days to calculate predictions

var tleDate = tleEpochDate(tleYr, tleDay);
var tStart = new Date(tyrc, tmonc, tdayc, thrsc);
console.log(moment(tStart).format("ddd MMM DD, YYYY h:mm A CT"));
console.log('Estimate of time and longitude at observer latitude near dusk');
console.log('TLE for', tleYr + 2000, ' day', tleDay, ' ', tleDate, '\n');

var vis1 = visdat(tStart);
var visLim = visibilityLimit(obsLat, incld, vis1.hh, altHz);
// console.log('visLim ', obsLat, inclo * rtd, '\n', vis1.r0, vis1.hh, visLim);

satVisibilityEstimate();
// This function is the main program and will print visibility info periodically
function satVisibilityEstimate() {
    var recalc = 0;
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

        // get satellite data at observer latitude
        var vis = visdat(duskp);
        console.log((i + 1) + ' dusk ' + duskStr + ' PM ' + ' hzAlt ' + vis.hzAng.toFixed(2));

        // set up adjustments for recalc to fix fly over before dusk, or super latitude issue
        if (recalc == 1) {
            recalc = 0;
            minAdd = 0;
        };
        // recalculate to fix a super latitude issue: delay start time by 5 minutes.
        //   For an oblate earth the actual satellite latitude can exceed orbit inclination.
        //   This causes problems with spherical triangle equations. (asin(#>1) = NAN)
        var ablats = Math.abs(vis.latitude);
        if (ablats > incld) {
            console.log(chalk.red('SuperLat', ablats.toFixed(4), '  orbit inc ', incld));
            i--;
            minAdd = 5;
            recalc = 1;
        };

        // print estimate of sat time and longitude at observer latitude crossing
        var sVis = satVis(duskp, vis);
        var tObs1 = sVis.tObs1;
        console.log(sVis.text1);
        console.log(sVis.text2);

        //  recalculate for too early pass, where observer fly over occurs before dusk'
        //    by delaying start time by 35 minutes.
        if (tObs1 < duskDf) { //
            console.log(chalk.cyan('too early'));
            i--;
            minAdd = 35
            recalc = 1
        };

        console.log(' ');
        nn++;
        if (nn > ndays + 4) {
            break
        };
    };
};

// find satellite location and orbit data at dusk, using SGP4 code
function visdat(now) {
    var positionAndVelocity = SGP4.propogate(issSatRec, now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    var gmst = SGP4.gstimeFromDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    var geodeticCoordinates = SGP4.eciToGeodetic(positionAndVelocity.position, gmst);
    var longitude = SGP4.degreesLong(geodeticCoordinates.longitude);
    var latitude = SGP4.degreesLat(geodeticCoordinates.latitude);
    var hh = geodeticCoordinates.height;
    var rr = hh + r0;
    var hzAng = Math.acos(r0 / rr) * rtd;
    var orbPeriod = ((2 * Math.PI) * rr) * (Math.sqrt((rr) / 398600.8)) / 60;
    return {
        orbPeriod: orbPeriod,
        latitude: latitude,
        longitude: longitude,
        hh: hh,
        hzAng: hzAng,
        gmst: gmst,
        posVel: positionAndVelocity
    };
};

function satVis(nowv, vis1) {
    // Estimate time and longitude when satellite crosses observer latitude,
    //   for both an ascending and a descending pass, using satellite data at dusk,
    //   using Napier's rules for spherical triangles.
    var velz = vis1.posVel.velocity.z;
    var orbP = vis1.orbPeriod;
    var incB = inclo;
    var latb0 = vis1.latitude;
    var lng0 = vis1.longitude;
    var hh = vis1.hh;
    var ti = (nowv.getHours() + (nowv.getMinutes() + nowv.getUTCSeconds() / 60) / 60) / 24;
    var mpd = 1440; //                            minutes per day
    var er = 0.25; //                             earth rate, deg/min
    var hP = orbP / 2; //                         half orbit period
    var nn = orbP / 360; //                       mean motion, minutes/deg
    var b0 = latb0; //                            satellite latitude, deg
    var b1 = obsLat; //                           observer latitude, deg
    var qq = Math.sign(velz); //                  asc/descending orbit (1/-1),
    var sB = Math.sin(incB);
    var cB = Math.cos(incB);
    var tB = Math.tan(incB);
    var tb0 = Math.tan(b0 / rtd);
    var tb1 = Math.tan(b1 / rtd);
    var sb0 = Math.sin(latb0 / rtd);
    var sb1 = Math.sin(obsLat / rtd);
    var cb1 = Math.cos(obsLat / rtd);
    var c0 = Math.asin(sb0 / sB) * rtd * qq; // orbit segment, node to ISS
    var c1 = Math.asin(sb1 / sB) * rtd * qq; // orbit segment, node to Obs Lat
    var dc = c1 - c0; //                        orbit segment, ISS to Obs Lat
    var t0 = c0 * nn; //                        time from node to ISS, minutes
    var t1 = c1 * nn; //                        time from node to Obs Lat
    var tnn = hP - t0; //                       time from ISS to next node
    var dt = dc * nn; //                        time delta, ISS to Obs Lat
    var tObs = ti + dt / mpd; //                estimated clock time at Obs Lat, day fraction
    var tnode = ti - t0 / mpd; //               node clock time est
    var tNnode = tnode + hP / mpd; //           next node clock time est
    var tNObs = tNnode - t1 / mpd; //           next Obs Lat clock time est
    var a0 = Math.asin(tb0 / tB) * rtd; //      Longitude segment, node to ISS
    var a1 = Math.asin(tb1 / tB) * rtd; //      Longitude segment, node to Obs Lat
    var da = a1 - a0; //                        Longitude segment, ISS to Obs Lat
    var de = er * dt; //                        earth rotation angle, ISS to obs
    var lng1 = angle2(lng0 + da * qq - de); //          estimate of ISS longitude at Obs Lat
    var lng1s = lng1.toFixed(2);
    var lngN = lng0 - a0 * qq + t0 * er; //     estimate of node longitude
    var lngNN = angle2(lngN + 180 - er * hP); //        estimate of Longitude of next node
    var lng2 = angle2(lngNN - a1 * qq + t1 * er); //  est of ISS longitude at next Obs Lat
    var lng2s = lng2.toFixed(2);
    var t0nn = t0 + tnn; //                     time node to node
    var aolc = Math.asin(cB / cb1) * rtd; //    orbit crossing angle at Obs Lat
    var dlng1 = obsLng - lng1; //                sat to obs lng diff at crossing1
    var dlng2 = obsLng - lng2; //               sat to obs lng diff at crossing2
    var dlngLim = visLim; //             deg lontitude visibility limit, see line ~ 44
    var ck1 = (Math.abs(dlng1) < dlngLim); //        visibility check 1
    var ck2 = (Math.abs(dlng2) < dlngLim); //        visibility check 2

    // find satellite sun angle when crossing obs latitude
    var dateX1 = crossTime(nowv, tObs);
    var dateX2 = crossTime(nowv, tNObs);
    var sunCurPos = SunCalc.getPosition(dateX1, obsLat, lng1);
    var sunAz1 = sunCurPos.azimuth * rtd;
    var sunAlt1 = sunCurPos.altitude * rtd + vis1.hzAng;
    var sunCurPos = SunCalc.getPosition(dateX2, obsLat, lng2);
    var sunAz2 = sunCurPos.azimuth * rtd;
    var sunAlt2 = sunCurPos.altitude * rtd + vis1.hzAng;
    var tRE1 = 0;
    var tRE2 = 0
    var satx1 = '';
    var satx2 = '';
    if (ck1 == 1) {
        aMx1 = maxAltEst(dlng1, aolc, hh).toFixed(0);
        tRE1 = (tRiseEst(-dlng1, aolc, hh, orbP, qq));
        var dkL1 = (sunAlt1 - dlng1); //   Estimate of lng ° from Obs when Sat goes into shadow
        // satx1 = ' mxA ' + aMx1 + '°  Sun ' + sunAlt1.toFixed(2) + ' ' + dkL1.toFixed(2);
        satx1 = ' mxA ' + aMx1 + '°  DarkDL ' + dkL1.toFixed(2) + '  tRE ' + tRE1.toFixed(2);
    };
    if (ck2 == 1) {
        aMx2 = maxAltEst(dlng2, aolc, hh).toFixed(0);
        tRE2 = (tRiseEst(-dlng2, aolc, hh, orbP, -qq));
        var dkL2 = (sunAlt2 - dlng2); //   Estimate of lng ° from Obs when Sat goes into shadow
        // satx2 = ' mxA ' + aMx2 + '°  Sun ' + sunAlt2.toFixed(2) + ' ' + dkL2.toFixed(2);
        satx2 = ' mxA ' + aMx2 + '°  DarkDL ' + dkL2.toFixed(2) + ' tRE ' + tRE2.toFixed(2);
    };
    // prepare text for output
    var svtx1 = timeTxx(dateX1, qq, ck1, tRE1);
    var svtx2 = timeTxx(dateX2, -qq, ck2, tRE2);
    var sxtx1 = svtx1 + '  lng1 ' + lng1s + ' ' + satx1;
    var sxtx2 = svtx2 + '  lng2 ' + lng2s + ' ' + satx2;

    return {
        tObs1: tObs * 24, //                        hours
        text1: sxtx1,
        text2: sxtx2
    }
};

// format latitude crossing time into standard js date.
function crossTime(nowz, tObs) {
    var tzyr = nowz.getFullYear();
    var tzmon = nowz.getMonth();
    var tzday = nowz.getDate(); //  UTC date at CT dusk is next day already.
    var tHr = Math.floor(tObs * 24);
    var tMin = Math.floor((tObs * 24 - tHr) * 60);
    var tSec = Math.floor(((tObs * 24 - tHr) * 60 - tMin) * 60);
    var date2 = new Date(tzyr, tzmon, tzday, tHr, tMin, tSec);
    return date2;
};

//   create date and time text for use in pll.js
function timeTxx(dateX, qq, ck, tRE) {
    var adj = Math.floor(tRE + 0.999);
    var ttx2a = 'time: ' + moment(dateX).subtract(adj, 'minutes').format("ddd MMM DD h:mm A ");
    // var ttx2a = 'time: ' + moment(dateX).format("ddd MMM DD h:mm A ");
    qtx = ' Asc';
    if (qq < 0) {
        qtx = ' Des';
    };
    var vis = ' NO';
    if (ck == 1) {
        vis = 'YES';
    };
    var ttx3 = ttx2a + qtx + ', ' + vis;
    return ttx3;
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

function visibilityLimit(obsLat, incl, hh, el) {
    // Central angle (th) from el,h
    rr = r0 + hh;
    b1 = obsLat;
    gam = 90 + el;
    sph = r0 / rr * Math.sin(gam / rtd);
    ph = Math.asin(sph) * rtd;
    th = 180 - gam - ph;
    cb1 = Math.cos(b1 / rtd);
    thL = th / cb1;
    //  Orbit angle at observer lat
    sa = Math.cos(incl / rtd) / cb1;
    a = Math.asin(sa) * rtd;
    //   Tangent intercept to visibility range
    xx1 = 1 / Math.sin(a / rtd);
    visLim = (xx1 * thL * 0.9).toFixed(2);
    return visLim;
}

function tRiseEst(dLng, ang, h, p, ad) {
    // test data
    // var ang = 49.01033;
    // var x1 = -1.1;
    // // var r0 = 6378;
    // var p = 92.72699 //      orbit period, minutes per orbit
    // var h = 405;
    // ad = 1; //               asd=1, des=-1
    var el = altHz;

    // Find Central angle, Slant Range, and x1
    var beta = el + 90; //                     ang: sat->obs->earth center
    var rs = r0 + h; //                        satellite orbit radius
    var sgam = r0 / rs * Math.sin(beta / rtd); // sin(gam) from sine rule
    var gam = Math.asin(sgam) * rtd; //        ang from sat nadir to obs
    var alpha = 180 - beta - gam; //           central ang to edge of field of view
    var s = rs * Math.sin(alpha / rtd) / Math.sin(beta / rtd); // slant range

    var cLatObs = Math.cos(obsLat / rtd);
    var x1 = dLng * cLatObs / alpha;

    // Unit Circle-Line intersections
    var m = ad * Math.tan((90 - ang) / rtd); // line slope
    var b = -m * x1; //                    y intercept
    var aa = 1 + m * m; //                 quadratic equation elements
    var bb = 2 * m * b;
    var cc = b * b - 1;
    var qq = bb * bb - 4 * aa * cc; //     discriminant
    var sqq = Math.sqrt(qq);
    var xp = (-bb + sqq) / 2 / aa; //       quadratic equation, plus √Q
    var xm = (-bb - sqq) / 2 / aa; //       quadratic equation, minus √Q
    var yp = m * xp + b;
    var ym = m * xm + b;
    var dx = x1 - xm;
    var sx = Math.sign(dx);
    var dcx = Math.sqrt(dx * dx + ym * ym); // dist from lat cross to left fov
    var dcxd = dcx * alpha; //           Central angle ° from lat cross to left fov
    // Time to lat crossing from FOV edge
    var n = p / 360;
    var tcx = sx * n * dcxd;

    return tcx; //         minutes of travel time from left FOV to lat cross
}

function maxAltEst(dLng, aolc, hh) {
    //  Estimate max alt assuming a flat plane at Observer point.
    var k = r0 * Math.cos(obsLat / rtd) / rtd;
    var s = Math.abs(k * dLng * Math.cos(aolc / rtd));
    var altMx = Math.atan(hh / s) * rtd;
    return altMx;
}

function tleEpochDate(yre, dyf) {
    yr = yre + 2000;
    dy = Math.floor(dyf);
    hrf = (dyf - dy) * 24;
    hr = Math.floor(hrf);
    minf = (hrf - hr) * 60;
    min = Math.floor(minf);
    scf = (minf - min) * 60;
    sc = Math.floor(scf);
    ms = (scf - sc) * 1000;
    ed1 = new Date(yr, 0, dy, hr, min, sc, ms);
    edate = moment(ed1).format("ddd MMM DD, YYYY h:mm:ss.SSS");
    return edate;
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
