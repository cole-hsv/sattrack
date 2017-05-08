var SunCalc = require('suncalc');
var rad = 180 / Math.PI;
var latObs = 34.7;
var lngObs = -86.59;
var date1 = new Date();
console.log('  ');
console.log(date1);
console.log('latObs', latObs, 'lngObs', lngObs);

var times = suncalc.getTimes(new Date(), latObs, lngObs);
var sunCurPos = Suncalc.getPosition(date1, latObs, lngObs);
var sunAz = sunCurPos.azimuth * rad;
var sunAlt = sunCurPos.altitude * rad;
console.log('azimuth', sunAz.toFixed(3), 'altitude', sunAlt.toFixed(3));
//
// // format sunrise time from the Date object
// var sunriseStr = times.sunrise.getHours() + ':' + times.sunrise.getMinutes();
// console.log('sunrise', sunriseStr);
// var sunsetStr = times.sunset.getHours() + ':' + times.sunset.getMinutes() + ':' + times.sunset.getUTCSeconds();
// console.log('sunset', sunsetStr);
//
// // get all of today's various sunlight times for Observer lat and lng
// var times = SunCalc.getTimes(new Date(), latObs, lngObs);
// console.log(times);
//
// // get position of the sun (azimuth and altitude) at today's sunrise
// var sunrisePos = SunCalc.getPosition(times.sunrise, latObs, lngObs);
// var sunsetPos = SunCalc.getPosition(times.sunset, latObs, lngObs);
//
// // get sunrise azimuth in degrees
// var sunriseAzimuth = sunrisePos.azimuth * rad;
// var sunsetAzimuth = sunsetPos.azimuth * rad;
// console.log('sunsetAzimuth', sunsetAzimuth.toFixed(3));
