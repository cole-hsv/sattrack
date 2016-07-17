var SGP4 = require('sgp4');
// Create data for plotting ISS current Lat-Long location for one orbit

// Sample ISS TLE Data
var issLine1 = "1 25544U 98067A   16141.43532379  .00016717  00000-0  10270-3 0  9028";
var issLine2 = "2 25544  51.6417 196.4833 0001609 119.2724 240.8590 15.54673668   663";
// var spotISS = "Time: Sun Apr 17 8:20 PM, Visible: 4 min, Max Height: 55°, Appears: 19° above NNW, Disappears: 26° above ESE";

// ISS					4/27/2016  11:38:28 AM
//     1 25544U 98067A   16118.48504141  .00016717  00000-0  10270-3 0  9023
//     2 25544  51.6425 310.9526 0001811  57.7714 302.3614 15.54316651 37098
// ISS
//     1 25544U 98067A   16108.51933851  .00016717  00000-0  10270-3 0  9020
//     2 25544  51.6451    .6413 0001729  34.2521 325.8743 15.54278349 35541
// Time: Sun Apr 17 8:20 PM, Visible: 4 min, Max Height: 55°, Appears: 19° above NNW, Disappears: 26° above ESE


console.log(' ')
    // Create a satellite record
var issSatRec = SGP4.twoline2rv(issLine1, issLine2, SGP4.wgs84());

// var vel = SGP4.sgp4(issSatRec, 0.0);
// console.log('vel', vel, vel.velocity.z); // fron SGP4 line 1313+

// console.log('SPG4.wgs84()', SGP4.wgs84());
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
    tmonc = 5;
    tdayc = 3;
    thrsc = 20 + 0; // 20
    tminc = 5;
    tsecc = 0.0 + 0;
    dt = 10;

    for (i = 0; i < 11; i++) {

        dmin = dt * (i - 1);
        if (i < 2) {
            dmin = 1
        }
        if (i < 1) {
            dmin = 0
        };

        var now = new Date(tyrc, tmonc, tdayc, thrsc, tminc + dmin, tsecc);
        if (i < 1) {
            console.log(now);
            console.log("time-Hr:min:s \t Latitude \t Longitude");
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
        console.log(now.getHours() + ":" + now.getMinutes() + ":" + now.getUTCSeconds() + '\t' + latitude + '\t' + longitude);
    }
    // Prints current speed of satellite in km/s
    // console.log('Velocity: ' + geodeticCoordinates.velocity + ' km/s');
    // Prints orbital period of satellite in minutes
    // 2pi * sqrt(Relative Height / Gravity of Earth * Mass of Earth)
    // console.log('Oribital Period: ' + ((2 * Math.PI) * (geodeticCoordinates.height + 6378.135)) * (Math.sqrt((geodeticCoordinates.height + 6378.135)/398600.8)) / 60);

    inc0 = issSatRec.inclo;
    hh = geodeticCoordinates.height;
    rr = hh + 6378.135;
    console.log('inc (rad)\t', inc0, '\nhh (km)\t', hh, '\nrr (km)\t', rr);
    console.log('Oribital Period:\t' + ((2 * Math.PI) * rr) * (Math.sqrt((rr) / 398600.8)) / 60);
    //conslole.log('velocity:\t' + ) //written by alex
    var observerPos = {
        // longitude: -117.61199249999999 * SGP4.deg2rad,
        // latitude: 33.4269728 * SGP4.deg2rad,
        longitude: -86.52 * SGP4.deg2rad,
        latitude: 34.728 * SGP4.deg2rad,
        height: 1
    };
    var satEcf = SGP4.eciToEcf(positionAndVelocity.position, gmst);
    var lookAngles = SGP4.topocentricToLookAngles(SGP4.topocentric(observerPos, satEcf));
    console.log("Azimuth: " + lookAngles.azimuth * SGP4.rad2deg);
    console.log("Elevation: " + lookAngles.elevation * SGP4.rad2deg);

    // Call printPosition in 750 ms
    // setTimeout(printPosition, 750);
}
printPosition();
