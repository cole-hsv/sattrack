var SGP4 = require('sgp4');
// Create data for plotting ISS current Lat-Long location for one orbit

// Sample ISS TLE Data
var issLine1 = "1 25544U 98067A   16108.51933851  .00016717  00000-0  10270-3 0  9020";
var issLine2 = "2 25544  51.6451    .6413 0001729  34.2521 325.8743 15.54278349 35541";
var spotISS = "Time: Sun Apr 17 8:20 PM, Visible: 4 min, Max Height: 55°, Appears: 19° above NNW, Disappears: 26° above ESE";

// ISS
//     1 25544U 98067A   16108.51933851  .00016717  00000-0  10270-3 0  9020
//     2 25544  51.6451    .6413 0001729  34.2521 325.8743 15.54278349 35541
// Time: Sun Apr 17 8:20 PM, Visible: 4 min, Max Height: 55°, Appears: 19° above NNW, Disappears: 26° above ESE

console.log(' ')
// Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());
 // console.log('SPG4.wgs84()', SGP4.wgs84());
 // console.log('issSatRec', issSatRec);
 console.log(issSatRec.epochyr, issSatRec.epochdays)

// This will print some info periodically
function printPosition() {
    // Current time
    var now1 = new Date();
    // console.log(' cdate:  ', now1);
    tyrc=now1.getFullYear();
    tmonc=now1.getMonth();
    tdayc=now1.getDate();
    thrsc=now1.getHours();
    tminc=now1.getMinutes();

    for (i = 0; i < 19; i++) {

      var now = new Date(tyrc,tmonc,tdayc,thrsc ,tminc + 5*i, 0.0);
      if (i<1) {
        console.log(now);
        console.log("time-Hr:min \t Latitude \t Longitude");
      }
      // console.log(' cdate:  ', now);
      // console.log(tyrc, tmonc + 1, tdayc, thrsc, tminc)

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
      console.log(now.getHours() + ":" + now.getMinutes() + '\t' + latitude + '\t' + longitude);
    }
    // Prints current speed of satellite in km/s
    // console.log('Velocity: ' + geodeticCoordinates.velocity + ' km/s');
    // Prints orbital period of satellite in minutes
    // 2pi * sqrt(Relative Height / Gravity of Earth * Mass of Earth)
    // console.log('Oribital Period: ' + ((2 * Math.PI) * (geodeticCoordinates.height + 6378.135)) * (Math.sqrt((geodeticCoordinates.height + 6378.135)/398600.8)) / 60);
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
