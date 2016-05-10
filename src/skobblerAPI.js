var ajax = require('ajax');
var watchFace = require('app.js');
var apiKey = 'fa48b4867abaa0899d0638a65138fb86';

var viaPoints = [];

module.exports.getRealReachData = getRealReachData;

/**
* Important note: in Api responses, x is longitude, and y is latitude
**/

/**
* Carries out RealReach request
* Will call getDirectionsData in callback method
**/
function getRealReachData(transportMethod, start, range){
  ajax(
    {
      url: buildRealReachURL(transportMethod, start, range),
      type: 'json'
    },
    function(data){
      console.log("RealReach Data Acquired");
      console.log(JSON.stringify(data));
      selectViaPoints(data);
      getDirectionsData(transportMethod, start, viaPoints);
    },
    function(error){
      console.log(error);
    }   
  );
}

function selectViaPoints(data){
  var perimeterPoints = data;
  //actually calculate perimeter points later
  viaPoints[0] = '44.96577,-93.2341';
}

/**
* Builds the URL for RealReach API Request. 
* Acceptable transportMethod values: 'pedestrian', 'car', 'bike'
* Acceptable start values: any valid GPS coordinates
* Acceptable range values: any valid length of time calculated in seconds
**/
function buildRealReachURL(transportMethod, start, range){
  var units = 'sec';
  var avoidHighways = '1';
  var useNonReachable = '0';
  var responseType = 'gps';
  var avoidTolls = '1';
  var url = 'http://'+apiKey+'.tor.skobbler.net/tor/RSngx/RealReach/json/18_0/en/'+apiKey+'?start='+start+'&transport='+transportMethod+
      '&range='+range+'&units='+units+'&toll='+avoidTolls+'&highways='+avoidHighways+'&nonReachable='+useNonReachable+'&response_type='+responseType;
  console.log(url);
  return url;
}

function getDirectionsData(transportMethod, start, viaPoints){
  ajax(
    {
      url: buildDirectionsURL(transportMethod, start, viaPoints),
      type: 'json'
    },
    function (data){
      console.log("Gathered Directions Data");
      console.log(JSON.stringify(data));
      watchFace.handleDirectionsAPIResponse(data);
    },
    function(error){
      console.log("Directions Data Error");
    }
  );
}

function buildDirectionsURL(transportMethod, start, viaPoint){
  var destination = start; //this will change, because we might have to recalculate while user is traveling
  if(transportMethod == 'car'){
    transportMethod = 'carShortest';
  }
  
  var url = 'http://'+apiKey+'.tor.skobbler.net/tor/RSngx/calcroute/json/18_0/en/'+apiKey+'?start='+start+'&dest='+destination+'&profile='+transportMethod+'&advice=yes&points=yes';
  //iterates through all via points and adds them
  for(var i in viaPoints){
    var currentPoint = viaPoints[i];
    url = url + '&v' + i + '=' + currentPoint;
  }
  
  console.log(url);
  return url;
}