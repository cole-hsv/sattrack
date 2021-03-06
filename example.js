var SGP4 = require('sgp4');

// Sample ISS TLE Data from March 26, 2016
var issLine1 = "1 25544U 98067A   16092.70325827  .00016717  00000-0  10270-3 0  9043";
var issLine2 = "2 25544  51.6422  79.5083 0002610  15.3326 344.7906 15.54337099 33086";

//
// ISS
//     1 25544U 98067A   16092.70325827  .00016717  00000-0  10270-3 0  9043
//     2 25544  51.6422  79.5083 0002610  15.3326 344.7906 15.54337099 33086
// Time: Fri Apr 01 7:47 PM, Visible: 4 min, Max Height: 49°, Appears: 38° above W, Disappears: 12° above NE

console.log(' ')
    // Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());
// console.log('SPG4.wgs84()', SGP4.wgs84());
//  console.log('issSatRec', issSatRec);

// This will print some info every 3/4th second
function printPosition() {
    // Current time

    // var now = new Date();
    var tsec = 20
    var now = new Date(2016, 3, 1, 16, 52, tsec);
    console.log('cdate:  ', now);

    //  3/27/2016  12:44:29 PM

    var spotdate = new Date(2016, 2, 29, 20, 44, 29);
    console.log('spotdate:  ', spotdate);

    // This will contain ECI (http://en.wikipedia.org/wiki/Earth-centered_inertial) coordinates of position and velocity of the satellite
    var positionAndVelocity = SGP4.propogate(issSatRec, now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

    // Prints ECI coordinates
    console.log(positionAndVelocity);

    // GMST required to get Lat/Long
    var gmst = SGP4.gstimeFromDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

    // Geodetic coordinates
    var geodeticCoordinates = SGP4.eciToGeodetic(positionAndVelocity.position, gmst);

    // Coordinates in degrees
    var longitude = SGP4.degreesLong(geodeticCoordinates.longitude);
    var latitude = SGP4.degreesLat(geodeticCoordinates.latitude);

    // Prints latitude of longitude of ISS
    console.log('Lat/Long: ' + latitude + ' ' + longitude);

    // Prints current speed of satellite in km/s
    // console.log('Velocity: ' + geodeticCoordinates.velocity + ' km/s');

    // Prints orbital period of satellite in minutes
    // 2pi * sqrt(Relative Height / Gravity of Earth * Mass of Earth)
    console.log('Oribital Period: ' + ((2 * Math.PI) * (geodeticCoordinates.height + 6378.135)) * (Math.sqrt((geodeticCoordinates.height + 6378.135) / 398600.8)) / 60);

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
