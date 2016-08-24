var ajax = require('ajax');
var watchFace = require('app.js');
var apiKey = 'fa48b4867abaa0899d0638a65138fb86';

var viaPoints = [];
var numViaPointsWanted = 3; //should never be modified in code. Only hardcoded here.
var numViaPointsNeeded = numViaPointsWanted;
var primaryReach = [];
var origin;

var acceptableTimeOverRequested = 300; //time in seconds.
var timeRequested;

var targetDistanceForIntersection = 300;
var acceptableDistanceForIntersection = targetDistanceForIntersection; //in meters
module.exports.createNewRoute = createNewRoute;
module.exports.getDirectionsData = getDirectionsData;
module.exports.reroute = reroute;

/**
* Important note: in Api responses, x is longitude, and y is latitude
**/

/**
* Carries out RealReach request
* Will call getDirectionsData in callback method
**/
function createNewRoute(transportMethod, start, range){
  var apiCallComplete = false;
  ajax(
    {
      url: buildRealReachURL(transportMethod, start, range),
      type: 'json'
    },
    function(data){
      apiCallComplete = true;
      /*In case the data could not be calculated, try again. Retains previous viaPoints*/
      if(data.status.apiCode == 683){
        console.log("API Code 683 Error. Trying Again After 2 second delay.");
        setTimeout(function(){createNewRoute(transportMethod, start, range);}, 2000);//calls createNewRoute after 5 second delay
        return;
      }
        
      /* For the first time through to establish starting info */
      if(primaryReach.length === 0){
        timeRequested = range;
        viaPoints = [];
        origin = start;
      }

      console.log("RealReach Data Acquired. Number of via points remaining: " + numViaPointsNeeded);
      console.log(JSON.stringify(data));      
      var numGarbagePrefaceValues = 8;
      var currentReach = data.realReach.gpsPoints;
      currentReach.splice(0, numGarbagePrefaceValues); //necessary because of odd unrelated GPS points at beginning of data
      numViaPointsNeeded--;
      //selects the next via point
      if(numViaPointsNeeded !== 0){
        var viaPoint = chooseNextViaPoint(currentReach);
        viaPoints[viaPoints.length] = viaPoint;
        createNewRoute(transportMethod, viaPoint, range);
      }
      //plots route after via points have been selected
      else{
        numViaPointsNeeded = numViaPointsWanted; //Resets it if a new route needs to be created
        primaryReach = []; //Resets if a new route needs to be created
        console.log("ViaPoints: " + viaPoints);
        getDirectionsData(transportMethod, origin, origin, viaPoints);
      }
    },
    function(error){
      apiCallComplete = true;
      console.log("Error: " + JSON.stringify(error));
      watchFace.handleAPIError(error);
    }   
  );
  
  console.log("Setting timer");
  setTimeout(
    function(){
      if(!apiCallComplete){
        console.log("API response time has exceeded 10 seconds");
        watchFace.handleAPITimeout();
      }
    }, 5000); //Lets user know that the API Call is taking longer than expected.
  console.log("timer set");
}

/**
* Builds the URL for RealReach API Request. 
* Acceptable transportMethod values: 'pedestrian', 'car', 'bike'
* Acceptable start values: any valid GPS coordinates
* Acceptable range values: any valid length of time calculated in seconds
**/
function buildRealReachURL(transportMethod, start, range){
  var rangePerViaPoint = Math.ceil(range/(numViaPointsWanted+1)); //because the total must be the input range. Math.ceil to make sure arguments conform to API protocol. Add one because points+1= line segments
  var units = 'sec';
  var useHighways = '0'; //TODO: Make sure highway and toll booleans match description of routing server
  var useNonReachable = '0';
  var responseType = 'gps';
  var useTolls = '0';
  var url = 'http://'+apiKey+'.tor.skobbler.net/tor/RSngx/RealReach/json/18_0/en/'+apiKey+'?start='+start+'&transport='+transportMethod+
      '&range='+rangePerViaPoint+'&units='+units+'&toll='+useTolls+'&highways='+useHighways+'&nonReachable='+useNonReachable+'&response_type='+responseType;
  console.log(url);
  return url;
}

function chooseNextViaPoint(currentReach){
  var newViaPoint;
  if(primaryReach.length === 0){
    console.log("Setting Primary Reach");
    primaryReach = currentReach;
    var randomIndex = chooseFirstIndexOfRandomLongLatPair(currentReach);    
    
    console.log("randomindex: " + randomIndex);
    var newViaPointLongitude = currentReach[randomIndex];
    var newViaPointLatitude = currentReach[randomIndex+1];
    newViaPoint = newViaPointLatitude + ',' + newViaPointLongitude;
    console.log("First Via Point: " + newViaPoint);
    return newViaPoint;
  }
  var intersectingPoints;
  
  /* Ensures that the app doesn't hang, and adds 50 meters to acceptable distance for every failed attempt */
  do{
    intersectingPoints = findIntersectingPoints(currentReach);
    acceptableDistanceForIntersection += 50;
  } while(intersectingPoints.length === 0);
  acceptableDistanceForIntersection = targetDistanceForIntersection; //reset for next calculation
  
  //Choose an intersecting point as the next viaPoint
  //First remove any repeat points
  for(var pointIndex in intersectingPoints){
    var point = intersectingPoints[pointIndex];
    for(var viaPointIndex in viaPoints){
      var viaPoint = viaPoints[viaPointIndex];
      
//       var distanceBetweenPoints = calculateDistanceBetweenGPSPoints(point)
      if (point == viaPoint){
        //TODO: Make the above if statement actually check distance
        intersectingPoints.splice(pointIndex, 1);//remove it from array
      }
    }
  }
  
  var newViaPointIndex = Math.floor(Math.random() * intersectingPoints.length); //NaN
  newViaPoint = intersectingPoints[newViaPointIndex];
  console.log(newViaPoint);
  console.log("num intersecting points: " + intersectingPoints.length);
  
  console.log("ViaPoints So far: " + viaPoints);
  return newViaPoint;
}


function chooseFirstIndexOfRandomLongLatPair(pairCollection){
  var randomIndex = Math.floor(Math.random()*pairCollection.length); //TODO: fix so that it actually can choose last index.
    if ((randomIndex % 2) !== 0){
      randomIndex--;
    }
  return randomIndex;
}

function findIntersectingPoints(currentReach){
//   console.log("chinchilla");
//   console.log("Current Reach: " + currentReach.length + " : " + JSON.stringify(currentReach));
//   console.log("Primary Reach: " + primaryReach.length + " : " + JSON.stringify(primaryReach));

  var intersectingPoints = [];
  
  for(var i = 0; i < currentReach.length; i+=2){
    for(var j = 0; j < primaryReach.length; j+=2){
      var distanceBetweenPoints = calculateDistanceBetweenGPSPoints(currentReach[i], currentReach[i+1], primaryReach[i], primaryReach[i+1]);
      if (distanceBetweenPoints <= acceptableDistanceForIntersection){
//         console.log("Intersect Found: " + currentReach[i+1] + ',' + currentReach[i]);
        intersectingPoints[intersectingPoints.length] = currentReach[i+1] + ',' + currentReach[i]; //Must have latitude first, then longitude for realReach
      }
    }
  }
  
//   console.log("finished");
  return intersectingPoints;
}

function calculateDistanceBetweenGPSPoints(longitudeOne, latitudeOne, longitudeTwo, latitudeTwo){
   //code taken from http://www.movable-type.co.uk/scripts/latlong.html. supposedly gives distance in meters between two coordinates
  var φ1 = toRadians(latitudeTwo), φ2 = toRadians(latitudeOne), Δλ = toRadians(longitudeOne-longitudeTwo), R = 6371000; // gives d in metres
  var distance = Math.acos( Math.sin(φ1)*Math.sin(φ2) + Math.cos(φ1)*Math.cos(φ2) * Math.cos(Δλ) ) * R;
//   if(distance < 100){
//     console.log("Distance between points: " + distance);
//   }
  return distance;
}

function toRadians(degrees){
  return degrees * Math.PI / 180;
}

function getDirectionsData(transportMethod, start, destination, viaPoints){
  ajax(
    {
      url: buildDirectionsURL(transportMethod, start, destination, viaPoints),
      type: 'json'
    },
    function (data){
      console.log("Gathered Directions Data");
      console.log(JSON.stringify(data));
      
      /*In case the data could not be calculated, try again. Retains previous viaPoints*/
      if(data.status.apiCode == 683){
        console.log("API Code 683 Error. Trying Again After 2 second delay.");
        setTimeout(function(){createNewRoute(transportMethod, start, timeRequested);}, 2000); //restarts the whole process
        return;
      }
      
      /* Check to see if the route is too long. If so, recalculate */
      var durationOfRoute = data.route.duration;
      var timeOverRequested = durationOfRoute - timeRequested;
      console.log("Route Length: " + durationOfRoute +", requested: " + timeRequested);
      if(timeOverRequested > acceptableTimeOverRequested){
        createNewRoute(transportMethod, start, timeRequested);
        console.log("Route too long. Recalculating");
      }
      
      else{
        watchFace.handleDirectionsAPIResponse(data);
      }
    },
    function(error){
      console.log("Directions Data Error");
      console.log(JSON.stringify(error));
      watchFace.handleDirectionsAPIError(error);
    }
  );
}

function buildDirectionsURL(transportMethod, start, destination, viaPoints){
  var useTolls = '0'; //0 is not using tolls, 1 is using tolls
  var useHighways = '0';
  if(transportMethod == 'car'){
    transportMethod = 'carFastest'; //now trying car fastest. carShortest often has vague and odd directions.
  }
  if(transportMethod == 'bike'){ //I know, I hate this just as much as you do
    transportMethod = 'bicycle';
  }
  
  var url = 'http://'+apiKey+'.tor.skobbler.net/tor/RSngx/calcroute/json/18_0/en/'+apiKey+'?start='+start+'&dest='+destination+'&profile='+transportMethod+'&toll='+useTolls+'&highways='+useHighways+'&advice=yes&points=yes';
  //iterates through all via points and adds them
  for(var i in viaPoints){
    var currentPoint = viaPoints[i];
    url = url + '&v' + i + '=' + currentPoint;
  }
  
  console.log(url);
  return url;
}

var numViaPointsForReroute = 3;
var numReroutePointsStillNeeded = numViaPointsForReroute;
var reachOne = [];
var reachTwo = [];
var rerouteViaPoints = [];
var pointOne;
var pointTwo;
function reroute(timeRemaining, currentLocation, origin, transportMethod){
  timeRequested = timeRemaining;
  //base case for recursion. Chooses final via point and calculates directions
  if(numReroutePointsStillNeeded <= 1){
    var intersectingPoints = findIntersectingPoints(reachOne, reachTwo);
    var lastViaPointIndex = Math.floor(Math.random() * intersectingPoints.length);
    var lastViaPoint = intersectingPoints[lastViaPointIndex];
    rerouteViaPoints[Math.ceil(numViaPointsForReroute/2)] = lastViaPoint;
    console.log(viaPoints);
    getDirectionsData(transportMethod, currentLocation, origin, rerouteViaPoints);
    return;
  }
  
  pointOne = currentLocation;
  pointTwo = origin;
  reachOne = [];
  reachTwo = [];
  realReachForReroute(transportMethod, currentLocation, timeRemaining);
  realReachForReroute(transportMethod, origin, timeRemaining);
}

function realReachForReroute(transportMethod, point, timeRemaining){
  ajax(
    {
    url: buildRealReachURLForReroute(transportMethod, point, timeRemaining),
    type: 'json'
    },
    function(data){
      console.log("RealReach Data Acquired");
      console.log(JSON.stringify(data));      
      var numGarbagePrefaceValues = 8;
      data = data.realReach.gpsPoints;
      data.splice(0, numGarbagePrefaceValues); //necessary because of odd unrelated GPS points at beginning of data
      
      if(reachOne.length === 0){
        reachOne = data;
      }
      else if(reachTwo.length === 0){
        reachTwo = data;
      }
      
      if(reachOne.length > 0 && reachTwo.length > 0){
        var newPointOne = findPointInListNearerOtherPoint(reachOne, pointOne, pointTwo);
        var newPointTwo = findPointInListNearerOtherPoint(reachTwo, pointTwo, pointOne);
        var indexOffset = numViaPointsForReroute - numReroutePointsStillNeeded;
        //Add points to viaPoints
        rerouteViaPoints[indexOffset] = newPointOne;
        rerouteViaPoints[numViaPointsForReroute-(indexOffset+1)] = newPointTwo; //add one because index from zero
        numReroutePointsStillNeeded--;
        reroute(timeRemaining, newPointOne, newPointTwo, transportMethod);
      }
    }
  );
}

function findPointInListNearerOtherPoint(listOfPoints, pointOne, pointTwo){
  pointOne = pointOne.split(",");
  var latitudeOne = pointOne[0];
  var longitudeOne = pointOne[1];
  pointTwo = pointTwo.split(",");
  var latitudeTwo = pointTwo[0];
  var longitudeTwo = pointTwo[1];
  
  var currentDistance = calculateDistanceBetweenGPSPoints(longitudeOne, latitudeOne, longitudeTwo, latitudeTwo);
  for(var i = 0; i < listOfPoints.length; i++){
    var newViaPointLongitude = listOfPoints[i];
    var newViaPointLatitude = listOfPoints[i+1];
    var newDistance = calculateDistanceBetweenGPSPoints(newViaPointLongitude, newViaPointLatitude, longitudeTwo, latitudeTwo);
    if(newDistance < currentDistance){
      return newViaPointLatitude+","+newViaPointLongitude; //if it doesn't return here at some point, something is seriously broken
    }
  }
}

function buildRealReachURLForReroute(transportMethod, start, range){
  var rangePerViaPoint = Math.ceil(range/(numViaPointsForReroute+1)); //Add one because points+1= line segments
  console.log("Range = " + rangePerViaPoint);
  //because the total must be the input range. Math.ceil to make sure arguments conform to API protocol
  var units = 'sec';
  var useHighways = '0'; //TODO: Make sure highway and toll booleans match description of routing server
  var useNonReachable = '0';
  var responseType = 'gps';
  var useTolls = '0';
  var url = 'http://'+apiKey+'.tor.skobbler.net/tor/RSngx/RealReach/json/18_0/en/'+apiKey+'?start='+start+'&transport='+transportMethod+
      '&range='+rangePerViaPoint+'&units='+units+'&toll='+useTolls+'&highways='+useHighways+'&nonReachable='+useNonReachable+'&response_type='+responseType;
  console.log(url);
  return url;
}