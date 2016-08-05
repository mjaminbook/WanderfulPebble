var ajax = require('ajax');
var watchFace = require('app.js');
var apiKey = 'fa48b4867abaa0899d0638a65138fb86';

var viaPoints = [];
var numViaPointsWanted = 4; //should never be modified in code. Only hardcoded here.
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
  ajax(
    {
      url: buildRealReachURL(transportMethod, start, range),
      type: 'json'
    },
    function(data){
      
      /*In case the data could not be calculated, try again. Retains previous viaPoints*/
      if(data.status.apiCode == 683){
        console.log("API Code 683 Error. Trying Again After 2 second delay.");
        setTimeout(function(){createNewRoute(transportMethod, start, range);}, 2000);//calls createNewRoute after 2 second delay
        return;
      }
        
      /* For the first time through to establish starting info */
      if(primaryReach.length === 0){
        timeRequested = range;
        viaPoints = [];
        origin = start;
      }

      numViaPointsNeeded--;
      console.log("RealReach Data Acquired");
      console.log(JSON.stringify(data));      
      var numGarbagePrefaceValues = 8;
      var currentReach = data.realReach.gpsPoints;
      currentReach.splice(0, numGarbagePrefaceValues); //necessary because of odd unrelated GPS points at beginning of data

      if(numViaPointsNeeded !== 0){
        var viaPoint = chooseNextViaPoint(currentReach);
        viaPoints[viaPoints.length] = viaPoint;
        createNewRoute(transportMethod, viaPoint, range);
      }
      else{
        numViaPointsNeeded = numViaPointsWanted; //Resets it if a new route needs to be created
        primaryReach = []; //Resets if a new route needs to be created
        console.log("ViaPoints: " + viaPoints);
        getDirectionsData(transportMethod, origin, origin, viaPoints);
      }
    },
    function(error){
      console.log("Error: " + JSON.stringify(error));
      watchFace.handleAPIError(error);
    }   
  );
}

function chooseFirstIndexOfRandomLongLatPair(pairCollection){
  var randomIndex = Math.floor(Math.random()*pairCollection.length); //TODO: fix so that it actually can choose last index.
    if ((randomIndex % 2) !== 0){
      randomIndex--;
    }
  return randomIndex;
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

/**
* selects a via point from data, and adds it to viaPoint array.
* Also returns the selected viaPoint
**/
// function selectViaPoint(data){
//   var perimeterPoints = data;
//   //actually calculate perimeter points later
//   viaPoints[0] = '44.96577,-93.2341';
// }

/**
* Builds the URL for RealReach API Request. 
* Acceptable transportMethod values: 'pedestrian', 'car', 'bike'
* Acceptable start values: any valid GPS coordinates
* Acceptable range values: any valid length of time calculated in seconds
**/
function buildRealReachURL(transportMethod, start, range){
  var rangePerViaPoint = Math.ceil(range/numViaPointsWanted); //because the total must be the input range. Math.ceil to make sure arguments conform to API protocol
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

function reroute(timeRemaining, currentLocation, origin, transportMethod){
  numViaPointsWanted = 2;
  numViaPointsNeeded = numViaPointsWanted;
  ajax(
    {
      url: buildDirectionsURL(transportMethod, currentLocation, origin, []),
      type: 'json'
    },
    function (data){
      console.log("Gathered Directions Data");
      console.log(JSON.stringify(data));
      
      var durationOfRoute;
      if(data.status.apiCode == 680){
        durationOfRoute = 0;
      }
      else{
        durationOfRoute = data.route.duration;
      }
      
      if(durationOfRoute >= timeRemaining){
        console.log("Time to origin too long. Headed to origin");
        watchFace.handleDirectionsAPIResponse(data);
        return;
      }
      else{
        calculateViaPointsForReroute(timeRemaining, currentLocation, origin, transportMethod);
      }
    },
    function(error){
      console.log("Directions Data Error");
      console.log(JSON.stringify(error));
      watchFace.handleAPIError(error);
    }
  );
}

var onCurrentLocationRealReach = true;
function calculateViaPointsForReroute(timeRemaining, currentLocation, origin, transportMethod){
  var url = "";
  if(onCurrentLocationRealReach){
    url = buildRealReachURL(transportMethod, currentLocation, timeRemaining);
  }
  else{
    url = buildRealReachURL(transportMethod, origin, timeRemaining);
  }
  ajax(
    {
      url: url,
      type: 'json'
    },
    function(data){
      
      /*In case the data could not be calculated, try again. Retains previous viaPoints*/
      if(data.status.apiCode == 683){
        console.log("API Code 683 Error. Trying Again.");
        calculateViaPointsForReroute(timeRemaining, currentLocation, origin, transportMethod);
        return;
      }
        
      /* For the first time through to establish starting info */
      if(onCurrentLocationRealReach){
        timeRequested = timeRemaining;
        viaPoints = [];
      }

      numViaPointsNeeded--;
      console.log("RealReach Data Acquired");
      console.log(JSON.stringify(data));      
      var numGarbagePrefaceValues = 8;
      var currentReach = data.realReach.gpsPoints;
      currentReach.splice(0, numGarbagePrefaceValues); //necessary because of odd unrelated GPS points at beginning of data

      if(onCurrentLocationRealReach){
        primaryReach = currentReach;
//         var viaPoint = chooseNextViaPoint(currentReach);
//         viaPoints[viaPoints.length] = viaPoint;
//         createNewRoute(transportMethod, viaPoint, range);
        onCurrentLocationRealReach = false;
        calculateViaPointsForReroute(timeRemaining, currentLocation, origin, transportMethod);
      }
      else{
        viaPoints[viaPoints.length] = chooseNextViaPoint(currentReach);
        numViaPointsNeeded = numViaPointsWanted; //Resets it if a new route needs to be created
        primaryReach = []; //Resets if a new route needs to be created
        onCurrentLocationRealReach = true; //Resets for possible future reroute
        console.log("ViaPoints: " + viaPoints);
        getDirectionsData(transportMethod, currentLocation, origin, viaPoints);
      }
    },
    function(error){
      console.log("Error: " + JSON.stringify(error));
      watchFace.handleAPIError(error);
    }   
  );
}