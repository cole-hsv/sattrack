var SGP4 = require('sgp4');
// Create data for plotting ISS current Lat-Long location for one orbit

// Sample ISS TLE Data
var issLine1 = "1 25544U 98067A   16141.43532379  .00016717  00000-0  10270-3 0  9028";
var issLine2 = "2 25544  51.6417 196.4833 0001609 119.2724 240.8590 15.54673668   663";
// var spotISS = "Time: Sun Apr 17 8:20 PM, Visible: 4 min, Max Height: 55°, Appears: 19° above NNW, Disappears: 26° above ESE";


function satVis(nowv, velz, orbP, incB, latb0, lng0, latObs, lngObs) {
    // ti: initial time (day fraction),  incB: inclination (deg)

    ti = (nowv.getHours() + (nowv.getMinutes() + nowv.getUTCSeconds() / 60) / 60) / 24;
    rtd = 57.29577951; //                     degrees per radian
    mpd = 1440; //                            minutes per day
    er = 0.25; //                             earth rate, deg/min
    hP = orbP / 2; //                         half orbit period
    nn = orbP / 360; //                       mean motion, minutes/deg
    b0 = latb0; //                            satellite latitude, deg
    b1 = latObs; //                           observer latitude, deg
    qq = Math.sign(velz); //                  asc/descending orbit (1/-1),
    sB = Math.sin(incB);
    cB = Math.cos(incB);
    tB = Math.tan(incB);
    tb0 = Math.tan(b0 / rtd);
    tb1 = Math.tan(b1 / rtd);
    sb0 = Math.sin(latb0 / rtd);
    sb1 = Math.sin(latObs / rtd);
    cb1 = Math.cos(latObs / rtd);
    c0 = Math.asin(sb0 / sB) * rtd * qq; // orbit segment, node to ISS
    c1 = Math.asin(sb1 / sB) * rtd * qq; // orbit segment, node to Obs Lat
    dc = c1 - c0; //                        orbit segment, ISS to Obs Lat
    t0 = c0 * nn; //                        time from node to ISS
    t1 = c1 * nn; //                        time from node to Obs Lat
    tnn = hP - t0; //                       time from ISS to next node
    dt = dc * nn; //                        time delta, ISS to Obs Lat
    tObs = ti + dt / mpd; //                estimated clock time at Obs Lat
    tObsHr = Math.floor(tObs * 24);
    tObsMin = Math.floor((tObs * 24 - tObsHr) * 60);
    tnode = ti - t0 / mpd; //               node clock time est
    tNnode = tnode + hP / mpd; //           next node clock time est
    tNObs = tNnode - t1 / mpd; //           next Obs Lat clock time est
    tNObsHr = Math.floor(tNObs * 24);
    tNObsMin = Math.floor((tNObs * 24 - tNObsHr) * 60);
    a0 = Math.asin(tb0 / tB) * rtd; //      Longitude segment, node to ISS
    a1 = Math.asin(tb1 / tB) * rtd; //      Longitude segment, node to Obs Lat
    da = a1 - a0; //                        Longitude segment, ISS to Obs Lat
    de = er * dt; //                        earth rotation angle, ISS to obs
    lng1 = angle2(lng0 + da * qq - de); //          estimate of ISS longitude at Obs Lat
    lng1s = Math.round(lng1 * 1000) / 1000;
    lngN = lng0 - a0 * qq + t0 * er; //     estimate of node longitude
    lngNN = angle2(lngN + 180 - er * hP); //        estimate of Longitude of next node
    lng2 = angle2(lngNN - a1 * qq + t1 * er); //  est of ISS longitude at next Obs Lat
    lng2s = Math.round(lng2 * 1000) / 1000;
    t0nn = t0 + tnn; //                     time node to node
    aolc = Math.asin(cB / cb1) * rtd; //    orbit crossing angle at Obs Lat
    dlng1 = lngObs - lng1; //                sat to obs lng diff at crossing1
    dlng2 = lngObs - lng2; //               sat to obs lng diff at crossing2
    ck1 = (Math.abs(dlng1) < 14); //        visibility check 1
    ck2 = (Math.abs(dlng2) < 14); //        visibility check 2
    svtx1 = timeTxx(nowv, tObsHr, tObsMin);
    svtx2 = timeTxx(nowv, tNObsHr, tNObsMin); //   ???????? ******** ?????????

    // console.log('lng0,da,de',lng0,da,de)

    console.log(svtx1, '\tlng1', lng1s, '\t', ck1);
    console.log(svtx2, '\tlng2', lng2s, '\t', ck2, "\n");
};

function timeTxx(nowx, thr, tmin) { //   create date and time text for pll.js
    ttx1 = 'time: ' + nowx;
    ttx2 = ttx1.substring(0, 17) + (thr - 12) + ':' + tmin + ' PM';
    return ttx2;
};

function angle2(ang) { //                fix angle between -180 to 180 deg
    while (ang > 180) {
        ang = ang - 360;
    };
    while (ang < -180) {
        ang = ang + 360;
    };
    return (ang);
};

console.log(' ')
    // Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());
// console.log('issSatRec', issSatRec);
// console.log(issSatRec.epochyr, issSatRec.epochdays);

// This will print some info periodically
function printPosition() {
    // Current time
    //var now1 = new Date();
    // console.log(' cdate:  ', now1);
    // tyrc=now1.getFullYear();
    // tmonc=now1.getMonth();
    // tdayc=now1.getDate();
    tyrc = 2016;
    tmonc = 4;
    tdayc = 25;
    thrsc = 20; // 20
    tminc = 0;
    tsecc = 0.0;
    dt = 10;

    for (i = 0; i < 17; i++) {

        var now = new Date(tyrc, tmonc, tdayc + i, thrsc, tminc, tsecc);
        if (i == 0) {
            console.log(now)
        };

        // console.log(' cdate:  ', now);
        // console.log(tyrc, tmonc + 1, tdayc, thrsc, tminc)

        // This will contain ECI (http://en.wikipedia.org/wiki/Earth-centered_inertial) coordinates of position and velocity of the satellite
        var positionAndVelocity = SGP4.propogate(issSatRec, now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        var gmst = SGP4.gstimeFromDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

        // Geodetic coordinates
        var geodeticCoordinates = SGP4.eciToGeodetic(positionAndVelocity.position, gmst);
        // Coordinates in degrees
        var longitude = SGP4.degreesLong(geodeticCoordinates.longitude);
        var latitude = SGP4.degreesLat(geodeticCoordinates.latitude);
        // Prints latitude of longitude of ISS
        // timetx = now.getHours() + ":" + now.getMinutes() + ":" + now.getUTCSeconds();
        inc0 = issSatRec.inclo;
        hh = geodeticCoordinates.height;
        rr = hh + 6378.135;
        orbPeriod = ((2 * Math.PI) * rr) * (Math.sqrt((rr) / 398600.8)) / 60;

        velz = positionAndVelocity.velocity.z;
        satVis(now, velz, orbPeriod, inc0, latitude, longitude, 34.7, -86.52);
    }

}
printPosition();;;;;;
