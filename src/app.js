/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');

var transportMethod;
var lengthOfTripString;
var tripTime;
var finalRouteData;
//gets watch locationand tracks it
var watchId;

function success(pos) {
  console.log('Location changed!');
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  userLat = pos.coords.latitude;
	userLong = pos.coords.longitude;
  origin = userLat+","+userLong;
  queryGoogleDirectionsAPI();
}

function error(err) {
  console.log('location error (' + err.code + '): ' + err.message);
}

var options = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 5000
};

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
			title: 'Select Your Wander Method',
			items: [{
				title: 'Driving'
			},{
				title: 'Bicycling'
			},{
				title: 'Walking'
			}]
		}]
	});
	vehicle.show();
	vehicle.on('select', function(e){
		console.log('You chose ' + e.item.title);
		transportMethod = e.item.title.toLowerCase();
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
    tripTime = e.item.data;
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
		beginTrip();
	});
}

var errorCard = new UI.Card({
  title: "Error: Request Denied.",
  subtitle: "Try again later :)"
});

//end of menu
var ajax = require('ajax');

function beginTrip(){
	console.log("Trip has begun!");
 	createRoute();
	//displayRoute(finalRouteData);
	// Get location updates
	watchId = navigator.geolocation.watchPosition(success, error, options);
}

var APIKey = 'AIzaSyCqbr5FiJlB0I3W35dtXS43yhmgQ5fLRRM';

var userLat;
var userLong;
var origin;

function initSuccess(pos){
	console.log('lat = ' + pos.coords.latitude + 'lon = ' + pos.coords.longitude);
	userLat = pos.coords.latitude;
	userLong = pos.coords.longitude;
	origin = userLat+","+userLong;
	//final destination is always the same as original origin
	destination = origin;
}

function initError(err){
	console.log('location error');
}

var initOptions = {
	enableHighAccuracy: true,
	maximumAge: 10000,
	timeout: 10000
};
//gets current position
navigator.geolocation.getCurrentPosition(initSuccess, initError, initOptions);


/**gets watch geolocation and tracks it**/




/**FOR FINDING GOOGLE PLACES AND INTERACTING WITH GOOGLE PLACES API**/
var placeResults;
var durationResults;
//TEMP DATA FOR TESTING
var userEnteredTime = 60;
var method = 1;
var keyword = "best view";
//method == 1 : walking
//method == 2 : biking
// default : driving
//----
var distanceResults;
var destinationResults;
var driving = 50;
var walking = 2;
var biking = 10;

function getGooglePlacesAPILink(){
  var basicURL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?";
  basicURL+= "location=" + origin;
  basicURL += "&radius="+ getBounds();
  //basicURL += "&keyword=" + keyword;
  basicURL += "&key=" + APIKey;
  return basicURL;
}

function getBounds(){
  var bounds;
  if(transportMethod == "driving"){
    bounds = tripTime*45; //lengthOfTrip may be a string. Convert to number in percentage of hours. Approx 45 miles per hour
    return bounds;
  }
  else if(transportMethod == "bicycling"){
    bounds = tripTime*9; //magic numbers!!!!
    return bounds;
  }
  else if(transportMethod == "walking"){
    bounds = tripTime*2.5; //magic numbers again! See first comment of function and guess.
    return bounds;
  }
  else{
    console.log("Error. tripTime not valid");
  }
}

function queryGooglePlacesAPI(){
  console.log("Fetching...");
  console.log(getGooglePlacesAPILink());
  ajax(
  	{
  		url: getGooglePlacesAPILink(),
  		type: 'json',
		async: 'false'
  	},
  	function(data){
  		console.log('Succesfully gathered places data!');
      console.log(data.results.length);
      if(data.status == "REQUEST_DENIED"){
        console.log("Request Denied. Try again later");
        errorCard.show();
      }
      else{
        //returns results
        //console.log(JSON.stringify(data));
		  setWaypoints(data);
      }
  	},
  	function(error){
  		console.log('Failed to gather places data :(');
  	}
  );
}

/**for finding directions based on google places data**/
// navigator.geolocation.getCurrentPosition(success, error, options);

//window.setTimeout(1000);
var destination;
var waypoints = [];
console.log(origin);

function createRoute(){
	queryGooglePlacesAPI();
	queryGoogleDirectionsAPI();
}

function setWaypoints(data){
  //takes results in from google places
// 	waypoints[0] = data.results[0].geometry.location.lat + "," + data.results[0].geometry.location.lng;
// 	waypoints[1] = data.results[1].geometry.location.lat + "," + data.results[1].geometry.location.lng;
// 	console.log("Waypoints length after set:" + waypoints.length);
	var numWaypoints = 5;
	var numResults = data.results.length;
	if(numResults < numWaypoints){
		numWaypoints= numResults;
	}
	var index;
	var currWaypoint;
	for(var i = 0; i < numWaypoints; i++){
		index = Math.floor(Math.random() * numResults);
		currWaypoint = data.results[index];
		waypoints[i] = currWaypoint.geometry.location.lat + "," + currWaypoint.geometry.location.lng;
		//removes element from array and decrements the number of waypoints
		data.results.splice(index, 1);
		numWaypoints--;
	}
	console.log("Waypoints: " +waypoints);
	console.log("Num waypoints: " + waypoints.length);
	
}
function getGoogleDirectionsLink(){
	var basicURL = "https://maps.googleapis.com/maps/api/directions/json?origin=";
//   to test
	basicURL += origin;
	basicURL+= "&destination=" + destination;
	basicURL+="&waypoints=";
  for(var point in waypoints){
    basicURL+="|via:" + waypoints[point];
    if(point == waypoints.length){
      basicURL+=""+waypoints[point];
    }
  }
  
  basicURL+="&mode="+transportMethod;
  basicURL += "&key=" + APIKey;
	return basicURL;
}


function queryGoogleDirectionsAPI(){
  ajax(
  	{
  		url: getGoogleDirectionsLink(),
  		type: 'json'
  	},
  	function(data){
  		console.log('Succesfully gathered directions data!');
		//console.log(getGoogleDirectionsLink());
  		//var time = data.routes[0].legs.length;
    if(data.length === 0){
		console.log(data);
		console.log("No Results Found");
		return false;
	}
		console.log(JSON.stringify(data));
    var distanceToWaypointData = (data.routes[0].legs[0].distance.text).split(" ");
		console.log("Distance Info: " + distanceToWaypointData);
    var distance = Number(distanceToWaypointData[0]);
    var distanceUnit = distanceToWaypointData[1];
    //removes waypoint when within 10 ft of it
    if(distanceUnit=="ft" && distance < 10){
      //waypoint reached
      //delete waypoint
      
      var removedWaypoint = waypoints.splice(0, 1);
      console.log("Removed Waypoint: " + removedWaypoint);
    }
      
		finalRouteData = data;
  		//console.log(time);
		displayRoute(data);
  	},
  	function(error){
  		console.log('Failed to gather directions data :(');
  	}
  );
}

function displayRoute(data){
	//var steps = data.routes[0].legs.steps;
	var distance = data.routes[0].legs[0].steps[1].distance.text;
	var duration = data.routes[0].legs[0].duration.text;
	var instructions = data.routes[0].legs[0].steps[1].html_instructions;
	instructions = instructions.replace(/(<([^>]+?)>)/ig,"");
	console.log(instructions,instructions.replace(/(<([^>]+?)>)/ig,""));
	var step = new UI.Card({
		title: instructions,
		subtitle: 'in ' + distance,
		body: 'ETA: ' + duration
	});
	step.show();
}
