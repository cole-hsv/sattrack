var SGP4 = require('sgp4');
// Create data for plotting ISS lat-Long for one orbit using TLE date and time, 5 min. intervals

var issLine1 = "1 25544U 98067A   16118.48504141  .00016717  00000-0  10270-3 0  9023";
var issLine2 = "2 25544  51.6425 310.9526 0001811  57.7714 302.3614 15.54316651 37098";
var spotISS = "Time: day Jun 16 9:20 PM";

// ISS
//     1 25544U 98067A   16108.51933851  .00016717  00000-0  10270-3 0  9020
//     2 25544  51.6451    .6413 0001729  34.2521 325.8743 15.54278349 35541
// Time: Sun Apr 17 8:20 PM, Visible: 4 min, Max Height: 55°, Appears: 19° above NNW, Disappears: 26° above ESE

console.log(' ')
// Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());

var posvel = SGP4.sgp4(issSatRec, 0.0);
console.log(posvel.position, posvel.velocity.z);  // fron SGP4 line 1313+
xtle=posvel.position.x;
ytle=posvel.position.y;
ztle=posvel.position.z;
rxy=Math.sqrt(xtle*xtle+ytle*ytle);
aaa=Math.atan2(ztle,rxy)*57.29577951;   //   doesn't match latitude!!!!!!      *******
console.log("x,z",xtle,ztle,"\nrxy,aaa",rxy,aaa);
// var longitude = Math.atan2(eci_coords["y"], eci_coords["x"]) - gmst; sgp4 line 1510


onerevm= 92.7234 + 0 ;         // estimated time for one rev (min/rev)
onerev= onerevm * 60000  ;
console.log('one rev estimate = ', onerevm, 'min/rev')

tyr=issSatRec.epochyr + 2000;
tdays=issSatRec.epochdays;
tday=Math.floor(tdays);
thrs=((tdays-tday)*24);
thr=Math.floor(thrs);
tmins=(thrs-thr)*60;
tmin=Math.floor(tmins);
tsecs=(tmins-tmin)*60;
nowtle= Date.UTC(tyr,0,tday, thr, tmin, tsecs);
console.log('nowtle', nowtle);

// This will print some info every tstep
function printPosition() {
    tstep=5*60000;
    for (i = 0; i < 20; i++) {
      nowstep=nowtle+tstep*i + onerev * 0 ;
      now=new Date(nowstep);
      if (i<1) {
        console.log(now);
        console.log("time-Hr:min \t Latitude \t Longitude");
      }
      // This will contain ECI (http://en.wikipedia.org/wiki/Earth-centered_inertial) coordinates of position and velocity of the satellite
      var positionAndVelocity = SGP4.propogate(issSatRec, now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
      // Prints ECI coordinates
      // console.log(positionAndVelocity);
      // GMST required to get Lat/Long
      var gmst = SGP4.gstimeFromDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
      // Geodetic coordinates
      var geodeticCoordinates = SGP4.eciToGeodetic(positionAndVelocity.position, gmst);
      // Coordinates in degrees
      var longitude = SGP4.degreesLong(geodeticCoordinates.longitude);
      var latitude = SGP4.degreesLat(geodeticCoordinates.latitude);
      // Prints latitude of longitude of ISS
      console.log(now.getHours() + ":" + now.getMinutes() + ' \t' + latitude + ' \t' + longitude);
    }
    // Prints current speed of satellite in km/s
    // console.log('Velocity: ' + geodeticCoordinates.velocity + ' km/s');
    // Prints orbital period of satellite in minutes
    // 2pi * sqrt(Relative Height / Gravity of Earth * Mass of Earth)
    hh=geodeticCoordinates.height;
    rr=hh + 6378.135
    console.log('hh',hh,'rr',rr)
    // console.log('Oribital Period: ' + ((2 * Math.PI) * (geodeticCoordinates.height + 6378.135)) * (Math.sqrt((geodeticCoordinates.height + 6378.135)/398600.8)) / 60);
    console.log('Oribital Period: ' + ((2 * Math.PI) * rr) * (Math.sqrt((rr)/398600.8)) / 60);

    var observerPos = {
        // longitude: -117.61199249999999 * SGP4.deg2rad,
        // latitude: 33.4269728 * SGP4.deg2rad,
        longitude: -86.52 * SGP4.deg2rad,
        latitude: 34.728 * SGP4.deg2rad,
        height: 1
    };
    var satEcf = SGP4.eciToEcf(positionAndVelocity.position, gmst);
    var lookAngles = SGP4.topocentricToLookAngles(SGP4.topocentric(observerPos, satEcf));
    // console.log("Azimuth: " + lookAngles.azimuth * SGP4.rad2deg);
    // console.log("Elevation: " + lookAngles.elevation * SGP4.rad2deg);
    // Call printPosition in 750 ms
    // setTimeout(printPosition, 750);
}
printPosition();
