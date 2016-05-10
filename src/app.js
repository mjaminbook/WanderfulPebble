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
module.exports.handleDirectionsAPIResponse = handleDirectionsAPIResponse;

//start of menu
var entry = new UI.Card({
	title: 'Wanderful',
	subtitle: 'Press Select to start!'
});

entry.show();

entry.on('click', 'select', function(e){
	beginTrip();
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
    skobbler.getRealReachData('car', origin, '600');
//     watchID = navigator.geolocation.watchPosition(positionChanged, positionError, watchOptions);
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
