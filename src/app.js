/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var skobbler = require('skobblerAPI.js');
var UI = require('ui');
// var Light = require('ui/light');
// var Vibe = require('ui/vibe');
var cachedInstructions;
var instructionPointer = 0;
var userLat;
var userLong;
var origin;
var destination;
var priorDistanceFromDirection;
var distanceFromDirection;
var distanceDivertedFromDirection;

var transportMethod;
var travelDuration;
var lengthOfTripString;

var positionWatcher;
module.exports.handleDirectionsAPIResponse = handleDirectionsAPIResponse;

//start of menu
var entry = new UI.Card({
	title: 'Wanderful',
	subtitle: 'Press Select to start!'
});

entry.show();

entry.on('click', 'select', function(e){
  chooseVehicle();
});

function chooseVehicle(){
	var vehicle = new UI.Menu({
		sections: [{
			title: 'Wander Method',
			items: [{
				title: 'Driving',
        data: 'car'
			},{
				title: 'Bicycling',
        data: 'bike'
			},{
				title: 'Walking',
        data: 'pedestrian'
			}]
		}]
	});
	vehicle.show();
	vehicle.on('select', function(e){
		console.log('You chose ' + e.item.title);
		transportMethod = e.item.data;
		chooseTime();
	});
}

function chooseTime(){
	var time = new UI.Menu({
		sections: [{
			title: 'Select Your Wander Time',
			items: [{
				title: '15 minutes',
        data: 0.25
			},{
				title: '30 minutes',
        data: 0.5
			},{
				title: '45 minutes',
        data: 0.75
			},{
				title: '1 hour',
        data: 1.0
			},{
				title: '1 hour, 15 minutes',
        data: 1.25
			},{
				title: '1 hour, 30 minutes',
        data: 1.5
			},{
				title: '1 hour, 45 minutes',
        data: 1.75
			},{
				title: '2 hours',
        data: 2.0
			}]
		}]
	});
	time.show();
	time.on('select', function(e) {
		console.log('You chose ' + e.item.title);
		lengthOfTripString = e.item.title;
    travelDuration = e.item.data;
    console.log("lengthOfTrip: " + lengthOfTripString);
		confirm();
	});
}

function confirm(){
	var confirm = new UI.Card({
		title: 'Your trip lasts ' + lengthOfTripString + ' by ' + transportMethod,
		subtitle: 'Press Select to begin!'
	});
	confirm.show();
	confirm.on('click', 'select', function(e){
    loadingCard.show();
		beginTrip();
	});
}

var errorCard = new UI.Card({
  title: "Error: Request Denied.",
  subtitle: "Try again later :)"
});

var loadingCard = new UI.Card({
  title: 'Calculating Route...'
});

function beginTrip(){
  
  var initOptions = {
    enableHighAccuracy: true,
    maximumAge: 500,
    timeout: 5000
  };
  //gets initial position and sets origin and destination
  navigator.geolocation.getCurrentPosition(initSuccess, initError, initOptions);
  
  function initSuccess(pos){
    userLat = pos.coords.latitude;
    userLong = pos.coords.longitude;
    origin = userLat+','+userLong;
    //destination will remain this value for the whole trip
    destination = origin;
    var travelDurationInSeconds = travelDuration * 60.0;
    skobbler.getRealReachData(transportMethod, origin, travelDurationInSeconds);
    
    //position listener defined
    positionWatcher = navigator.geolocation.watchPosition(positionChanged, positionError, watchOptions);
  }
  
  function initError(err){
    console.log('location error (' + err.code + '): ' + err.message);
    console.log('Re-Attmpting Initialization');
    //will keep performing this method until there is a success
    beginTrip();
  }
}

function handleDirectionsAPIResponse(directionsData){
  console.log("parsing directions data");
  cachedInstructions = directionsData.route.advisor;
  instructionPointer = 0;
  updateUI();
}

var step;

function updateUI(){
  var instructions = cachedInstructions[instructionPointer].instruction;
  
  step = new UI.Card({
		title: instructions,
		subtitle: 'in ' + cachedInstructions[instructionPointer].distance + ' m',
		//body: 'ETA: ' + duration,
		scrollable: true
	});

	step.show();
}

function positionChanged(pos) {
  console.log('Location changed!');
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  userLat = pos.coords.latitude;
	userLong = pos.coords.longitude;
  origin = userLat+","+userLong;
  //queryGoogleDirectionsAPI(getGoogleDirectionsLink());
  updateDistance();
  checkNeedNewRoute();
  updateUI();
}

function positionError(err){
  console.log('location error (' + err.code + '): ' + err.message);
  console.log("Could not update location. Make sure you are in range of service.");
}

var watchOptions = {
  enableHighAccuracy: true,
  maximumAge: 500,
  timeout: 5000
};

function updateDistance(){
  priorDistanceFromDirection = distanceFromDirection;
  //calculate current distance from direction
  var endLat = cachedInstructions[instructionPointer].y;
  var endLong = cachedInstructions[instructionPointer].x;

  //code taken from http://www.movable-type.co.uk/scripts/latlong.html. supposedly gives distance in meters between two coordinates
  var φ1 = toRadians(endLat), φ2 = toRadians(userLat), Δλ = toRadians(userLong-endLong), R = 6371000; // gives d in metres
  var newDistance = Math.acos( Math.sin(φ1)*Math.sin(φ2) + Math.cos(φ1)*Math.cos(φ2) * Math.cos(Δλ) ) * R;
  
  distanceFromDirection = newDistance;
  
  var distanceChange = distanceFromDirection - priorDistanceFromDirection; //if negative, distance is decreasing
  if(distanceChange > 0){ //distance increasing. User is diverted from route
    distanceDivertedFromDirection += distanceChange;
  }
  else if(distanceChange < 0){//distance decreasing. User on route. reset distanceDiverted
    distanceDivertedFromDirection = 0;
    console.log('Distance Diverted Reset');
  }
  //for testing purposes
  console.log("Distance Updated");
  console.log("prior distance: " + priorDistanceFromDirection);
  console.log("current distance: " + distanceFromDirection);
}

function toRadians(degrees){
  return degrees * Math.PI / 180;
}

function checkNeedNewRoute(){
  var distanceDiverted = checkDistanceDiverted();
  if(distanceDiverted > 15){//in meters
    skobbler.getDirectionsData('car', userLat+','+userLong, origin, []); //only immediately brings you home
  }
}

/**
Returns value of distanceChange. if return is positive, distance has been increasing
**/
function checkDistanceDiverted(){
  console.log("distance diverted: " + distanceDivertedFromDirection);
  return distanceDivertedFromDirection;
}