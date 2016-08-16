/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var skobbler = require('skobblerAPI.js');
var UI = require('ui');
var vibe = require("ui/vibe");
var light = require("ui/light");
var Vector2 = require("vector2");
var cachedInstructions;
var instructionPointer = 0;
var userLat;
var userLong;
var origin;
var destination;
var priorDistanceFromDirection;
var distanceFromDirection;
var distanceDivertedFromDirection = 0; //begin at zero diversion

var acceptableDistanceForNextDirection = 15; //in meters. Should maybe be lower.

var transportMethod;
var travelDuration;
var travelDurationInSeconds;
var lengthOfTripString;

var positionWatcher;
var positionWatcherDefined = false;

var timeWanderBegan;
var timeRemainingInWander;

var distanceToBuzzAndLight = 75; //in meters
var watchBuzzedAndLit = false; //Lol, buzzedAndLit

module.exports.handleDirectionsAPIResponse = handleDirectionsAPIResponse;
module.exports.handleAPIError = handleAPIError;

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
        data: 15 //in minutes
			},{
				title: '30 minutes',
        data: 30
			},{
				title: '45 minutes',
        data: 45
			},{
				title: '1 hour',
        data: 60
			},{
				title: '1 hour, 15 minutes',
        data: 75
			},{
				title: '1 hour, 30 minutes',
        data: 90
			},{
				title: '1 hour, 45 minutes',
        data: 105
			},{
				title: '2 hours',
        data: 120
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

var connectionErrorCard = new UI.Card({
  title: "Connection Error",
  subtitle: "Cannot Connect. Still Trying."
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
    travelDurationInSeconds = travelDuration * 60.0;
    console.log(transportMethod + ", " + origin + ", " + travelDurationInSeconds);
    var d = new Date();
    timeWanderBegan = (d.getTime() / 1000); //Added for rerouting. in seconds
    skobbler.createNewRoute(transportMethod, origin, travelDurationInSeconds);
  }
  
  function initError(err){
    console.log('location error (' + err.code + '): ' + err.message);
    console.log('Re-Attmpting Initialization');
    connectionErrorCard.show();
    //will keep performing this method until there is a success
    beginTrip();
  }
}

function handleDirectionsAPIResponse(directionsData){
  console.log("parsing directions data");
  cachedInstructions = directionsData.route.advisor;
  instructionPointer = 0;
  
  //Removes the issue where the prior distance is retained through calculations, causing an auto-reroute
  var endLat = cachedInstructions[instructionPointer].coordinates.y;
  var endLong = cachedInstructions[instructionPointer].coordinates.x;
  distanceFromDirection = calculateDistanceBetweenGPSPoints(userLong, userLat, endLong, endLat);//MARK: changed last test
  priorDistanceFromDirection = distanceFromDirection;
  distanceDivertedFromDirection = 0;
  
  var needsNewInstruction = true;
  updateUI(needsNewInstruction);
      
  //position listener defined
  if(!positionWatcherDefined){
    positionWatcher = navigator.geolocation.watchPosition(positionChanged, positionError, watchOptions);
    positionWatcherDefined = true;
  }
  
}

function handleAPIError(error){
  var errorCard = new UI.Card({
    title: "An Error has occurred:",
    subtitle: JSON.stringify(error),
    body: "Recalculating Route. Please be patient."
  });
  
  errorCard.show();
}

/* The following is all for the instructions UI, and a little janky */
var step = new UI.Window();
step.backgroundColor('white');
var titleUIText = new UI.Text({text: 'test',
                               color: 'black',
                               font: 'gothic-28-bold',
                               position: new Vector2(5, 0),
                               size: new Vector2(134, 90),
                               textOverflow: 'wrap'});
var distanceUIText = new UI.Text({text: 'test',
                                  color: 'black',
                                  font: 'gothic-24-bold',
                                  position: new Vector2(5, 90),
                                  size: new Vector2(134, 300),
                                  textOverflow: 'wrap'});
step.add(titleUIText);
step.add(distanceUIText);
step.scrollable(true);

function updateUI(needsNewInstruction){
  var instructions = cachedInstructions[instructionPointer].instruction;
  var distanceText = 'in ' + Math.floor(distanceFromDirection) + ' m ('+instructionPointer+'/'+cachedInstructions.length+')';
  if(needsNewInstruction){
    step.show();
    titleUIText.text(instructions); 
    var sizeOfTitleText = calculateUITextHeight(28, 15, instructions);
    titleUIText.size(new Vector2(134, sizeOfTitleText));
    distanceUIText.position(new Vector2(5, sizeOfTitleText));
  }

  distanceUIText.text(distanceText);
}

/* This is disgusting, but PebbleJS provides no nice way to dynamically size Text elements, so I must estimate the size of the text using some magic numbers */
function calculateUITextHeight(fontSize, charsPerLine, string) {
	var split = strTruncateWhole(string, charsPerLine);
	var height = split.length * fontSize;
	return height;
}

function strTruncateWhole(string, width) {
	var arr = [];
	string = string.replace(/[\s]+/, ' ');
	var b = 0;
	while (b < string.length) {
		arr.push(strTruncate(string.substring(b), width));
		b += arr[arr.length - 1].length;
	}
	return arr;
}

function strTruncate(string, width) {
	string = string.replace(/[\s]+/, ' ');
	if (string.length >= width) {
		return string[width - 1] === ' ' ? string.substr(0, width - 1) : string.substr(0, string.substr(0, width).lastIndexOf(' '));
	}
	return string;
}
/* End disgustingness */

function positionChanged(pos) {
  console.log('Location changed!');
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  userLat = pos.coords.latitude;
	userLong = pos.coords.longitude;
  updateDistance();
  updateInstructions();
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

function updateInstructions(){
  var rerouting = checkNeedNewRoute();
  if(rerouting){
    return;
  }
  
  var newInstruction = checkNeedNewInstruction();
  updateUI(newInstruction);
}

function updateDistance(){
  priorDistanceFromDirection = distanceFromDirection;
  //calculate current distance from direction
  var endLat = cachedInstructions[instructionPointer].coordinates.y;
  var endLong = cachedInstructions[instructionPointer].coordinates.x;

  distanceFromDirection = calculateDistanceBetweenGPSPoints(userLong, userLat, endLong, endLat); //MARK: changed last test
  
  var distanceChange = distanceFromDirection - priorDistanceFromDirection; //if negative, distance is decreasing
  if(distanceChange > 0){ //distance increasing. User is diverted from route
    distanceDivertedFromDirection += distanceChange;
  }
  else if(distanceChange < 0){//distance decreasing. User on route. reset distanceDiverted
    distanceDivertedFromDirection = 0;
    console.log('Distance Diverted Reset');
  }
  
  if(distanceFromDirection < distanceToBuzzAndLight && watchBuzzedAndLit === false){
    vibe.vibrate("long");
    light.on("long");
    watchBuzzedAndLit = true;
  }
  //for testing purposes
  console.log("Distance Updated");
  console.log("prior distance: " + priorDistanceFromDirection);
  console.log("current distance: " + distanceFromDirection);
}


function calculateDistanceBetweenGPSPoints(longitudeOne, latitudeOne, longitudeTwo, latitudeTwo){
   //code taken from http://www.movable-type.co.uk/scripts/latlong.html. supposedly gives distance in meters between two coordinates
  var φ1 = toRadians(latitudeTwo), φ2 = toRadians(latitudeOne), Δλ = toRadians(longitudeOne-longitudeTwo), R = 6371000; // gives d in metres
  var distance = Math.acos( Math.sin(φ1)*Math.sin(φ2) + Math.cos(φ1)*Math.cos(φ2) * Math.cos(Δλ) ) * R;
  return distance;
}

function toRadians(degrees){
  return degrees * Math.PI / 180;
}

function checkNeedNewRoute(){
  var distanceDiverted = checkDistanceDiverted();
  if(distanceDiverted > 20){//in meters
    console.log("Distance Diverted Too Great. Creating New Route");
    navigator.geolocation.clearWatch(positionWatcher); //to prevent interruption from positionWatcher
    positionWatcherDefined = false;
    loadingCard.show();
    distanceDivertedFromDirection = 0; //This is necessary to prevent infinite route creation. 
    //TODO: This will create a route from the origin. Should create a route from current position that ends in origin within time limit
//     skobbler.createNewRoute(transportMethod, origin, travelDurationInSeconds);
    //TODO: this creates a route that returns directly to the origin. Fix with the suggestion in TODO above.
    var userPosition = userLat+','+userLong;
    var d = new Date();
    var currentTime = d.getTime()/1000; //in seconds
    timeRemainingInWander = travelDurationInSeconds - (currentTime - timeWanderBegan);
    console.log("Time Remaining: " + timeRemainingInWander);
    console.log("Time Began: " + timeWanderBegan);
    console.log("Current Time: " + currentTime);
    skobbler.reroute(timeRemainingInWander, userPosition, origin, transportMethod); //MARK: changed last test. Is really hacky
    return true;
  }
  return false;
}

/* Checks to see if the user is ready for a new instruction. If so, it updates necessary information and returns true. Otherwise, returns false. */
function checkNeedNewInstruction(){
  if(distanceFromDirection < acceptableDistanceForNextDirection){
    console.log("New Instruction Being Loaded");
    console.log(cachedInstructions[instructionPointer].instruction);
    instructionPointer++;
    
    if(instructionPointer == cachedInstructions.length){
      wanderComplete();
    }
    
    /*Done to create a more accurate beginning distance. Previous solution may have caused premature rerouting*/
    var endLat = cachedInstructions[instructionPointer].coordinates.y;
    var endLong = cachedInstructions[instructionPointer].coordinates.x;
    distanceFromDirection = calculateDistanceBetweenGPSPoints(userLong, userLat, endLong, endLat);//MARK: changed last test
    priorDistanceFromDirection = distanceFromDirection;
    distanceDivertedFromDirection = 0;
    
    watchBuzzedAndLit = false;
    
    return true;
  }
  return false;
}
/**
Returns value of distanceChange. if return is positive, distance has been increasing
**/
function checkDistanceDiverted(){
  console.log("distance diverted: " + distanceDivertedFromDirection);
  return distanceDivertedFromDirection;
}

function wanderComplete(){
  console.log("Wander Complete");
  navigator.geolocation.clearWatch(positionWatcher); //to prevent interruption from positionWatcher
  positionWatcherDefined = false;
  
  var endCard = new UI.Card({
    title: "Wander Complete",
    subtitle: "Thanks for Wandering!"
  });
  
  endCard.show();
}