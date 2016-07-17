var SunCalc = require('suncalc');
var rad = 180 / Math.PI;
var latObs = 34.7;
var lngObs = -86.59;
var date1 = new Date(2016, 5, 4, 19, 29, 49, 0);
console.log('  ');
console.log(date1);
console.log('latObs', latObs, 'lngObs', lngObs);

// var times = SunCalc.getTimes(new Date(), latObs, lngObs);
var times = SunCalc.getTimes(date1, latObs, lngObs);

var sunCurPos = SunCalc.getPosition(date1, latObs, lngObs);
var sunAz = sunCurPos.azimuth * rad;
var sunAlt = sunCurPos.altitude * rad;
var sunra = (sunCurPos.rightAsc * rad).toFixed(4);
var sundec = (sunCurPos.declin * rad).toFixed(4);
var sunSidT = ((sunCurPos.sT * rad) % 360).toFixed(4);
var sunHrAng = ((sunCurPos.Ha * rad) % 360).toFixed(4);


console.log('azimuth', sunAz.toFixed(5), ' altitude', sunAlt.toFixed(5), ' ra', sunra, ' dec', sundec);
console.log('Sid Time\t' + sunSidT + '\tsunHrAng\t' + sunHrAng);

// format sunrise time from the Date object
var sunriseStr = times.sunrise.getHours() + ':' + times.sunrise.getMinutes();
console.log('sunrise', sunriseStr);
var sunsetStr = times.sunset.getHours() + ':' + times.sunset.getMinutes() + ':' + times.sunset.getUTCSeconds();
var duskStr = (times.dusk.getHours() - 12) + ':' + times.dusk.getMinutes() + ':' + times.dusk.getUTCSeconds(); + ' PM';
var duskHrs = times.dusk.getHours() + times.dusk.getMinutes() / 60
console.log('sunset', sunsetStr, '  dusk', duskStr, 'duskHrs', duskHrs.toFixed(2));

// get all of today's various sunlight times for Observer lat and lng
//var times = SunCalc.getTimes(new Date(), latObs, lngObs);
//console.log(times);

// get position of the sun (azimuth and altitude) at today's sunrise
var sunrisePos = SunCalc.getPosition(times.sunrise, latObs, lngObs);
var sunsetPos = SunCalc.getPosition(times.sunset, latObs, lngObs);

// get sunrise azimuth in degrees
var sunriseAzimuth = sunrisePos.azimuth * rad;
var sunsetAzimuth = sunsetPos.azimuth * rad;
console.log('sunsetAzimuth', sunsetAzimuth.toFixed(3));

// Test mu functions
// latObs = 0;
// lngObs = 50;
sunAlt = 3.91279;
sunAz = 114.83506 + 180;
var coord = sunXYZLL(latObs, lngObs, sunAlt, sunAz);
console.log('sunXYZLL \n', coord, coord.latsun, coord.lngsun);

var crd = xyzfLL(coord.latsun, coord.lngsun);
console.log('xyzfLL \n', crd);

// This converts Alt-Az to XYZ and Lat-Lng
function sunXYZLL(latObs, lngObs, sunAlt, sunAzS) {
    slat = Math.sin(latObs / rad);
    clat = Math.cos(latObs / rad);
    slng = Math.sin(lngObs / rad);
    clng = Math.cos(lngObs / rad);
    sAlt = Math.sin(sunAlt / rad);
    cAlt = Math.cos(sunAlt / rad);
    sunAz = sunAzS;
    sAz = Math.sin(sunAz / rad);
    cAz = Math.cos(sunAz / rad);
    U = sAlt;
    E = cAlt * sAz;
    N = cAlt * cAz;
    X = clat * clng * U - slng * E - slat * clng * N;
    Y = clat * slng * U + clng * E - slat * slng * N;
    Z = slat * U + clat * N;
    latsun = Math.asin(Z) * rad;
    lngsun = Math.atan2(Y, X) * rad;
    return {
        X: X.toFixed(6),
        Y: Y.toFixed(6),
        Z: Z.toFixed(6),
        latsun: latsun.toFixed(4),
        lngsun: lngsun.toFixed(4)
    };
};

// This converts Lat-Lng to XYZ
function xyzfLL(lat, lng) {
    slat = Math.sin(lat / rad);
    clat = Math.cos(lat / rad);
    slng = Math.sin(lng / rad);
    clng = Math.cos(lng / rad);
    var X = clat * clng;
    var Y = clat * slng;
    var Z = slat;
    return {
        X: X.toFixed(6),
        Y: Y.toFixed(6),
        Z: Z.toFixed(6)
    };
};
