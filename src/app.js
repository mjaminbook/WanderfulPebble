/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Light = require('ui/light');
var Vibe = require('ui/vibe');

var transportMethod;
var lengthOfTripString;
var tripTime;
var finalRouteData;
//gets watch locationand tracks it
var watchId;
var lastInstruction = "";
var vibeFlag = false;
var ajax = require('ajax');
var APIKey = 'AIzaSyBKu72O30sBJI78lw7h1DWI3ApwWTgTLl8';

var userLat;
var userLong;
var origin;
var destination;
var waypoints = [];


function success(pos) {
  console.log('Location changed!');
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  userLat = pos.coords.latitude;
	userLong = pos.coords.longitude;
  origin = userLat+","+userLong;
  queryGoogleDirectionsAPI(getGoogleDirectionsLink());
}

function queryGoogleDirectionsAPI(url){
  ajax(
  	{
  		url: url,
  		type: 'json'
  	},
  	function(data){
  		console.log('Succesfully gathered directions data!');

      if(data.length === 0){
    		console.log(data);
    		console.log("No Results Found");
    		return false;
  	  }
      
		//Can cause error with data.routes.legs when waypoints is empty
  		console.log(JSON.stringify(data));
      	var distanceToWaypointData = (data.routes[0].legs[0].distance.text).split(" ");
  		console.log("Distance Info: " + distanceToWaypointData);
     	var distance = Number(distanceToWaypointData[0]);
    	var distanceUnit = distanceToWaypointData[1];
		
		//removes waypoint when within 100 ft of it
	if(distanceUnit=="ft" && distance < 500){
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

function getGoogleDirectionsLink(){
	var basicURL = "https://maps.googleapis.com/maps/api/directions/json?origin=";
//   to test
	basicURL += origin;
	basicURL+= "&destination=" + destination;
	//optimize:true begins a traveling salesman problem
	basicURL+="&waypoints=optimize:true";
  for(var point in waypoints){
	  //via removed
    basicURL+="|" + waypoints[point];
    if(point == waypoints.length){
      basicURL+=""+waypoints[point];
    }
  }
  
  basicURL+="&mode="+transportMethod;
  basicURL += "&key=" + APIKey;
	console.log(basicURL);
	return basicURL;
}

function error(err) {
  console.log('location error (' + err.code + '): ' + err.message);
}

var options = {
  enableHighAccuracy: true,
  maximumAge: 500,
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

function beginTrip(){
	console.log("Trip has begun!");
 	createRoute();
	//displayRoute(finalRouteData);
	// Get location updates
	watchId = navigator.geolocation.watchPosition(success, error, options);
}



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

/**FOR FINDING GOOGLE PLACES AND INTERACTING WITH GOOGLE PLACES API**/
function getGooglePlacesAPILink(){
  var basicURL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?";
  basicURL+= "location=" + origin;
  basicURL += "&radius="+ getBounds();
  basicURL += "&key=" + APIKey;
  return basicURL;
}

function getBounds(){
  var bounds;
  //Connor loves this code <3. magic numbers in meters, btw
  if(transportMethod == "driving"){
    bounds = (tripTime*49999)/2; //Convert to number in percentage of hours.
  }
  else if(transportMethod == "bicycling"){
    bounds = (tripTime*15000)/2; //magic numbers!!!!
  }
  else if(transportMethod == "walking"){
    bounds = (tripTime*5000)/2; //magic numbers again! See first comment of function and guess.
  }
  else{
    console.log("Error. tripTime not valid");
  }
  //Google API max radius is 50000
  if(bounds > 50000){
    bounds = 50000;
  }
  return bounds;
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
		  setWaypoints(data);
      }
  	},
  	function(error){
  		console.log('Failed to gather places data :(');
  	}
  );
}

/**for finding directions based on google places data**/
console.log(origin);

function createRoute(){
	queryGooglePlacesAPI();
	queryGoogleDirectionsAPI();
}

function setWaypoints(data){
	var numDesiredWaypoints = 5;
	var numWaypoints = numDesiredWaypoints;
	var numResults = data.results.length;
	if(numResults < numWaypoints){
		numWaypoints= numResults;
	}
	var index;
	var currWaypoint;
	for(var i = 0; i < numDesiredWaypoints; i++){
		index = Math.floor(Math.random() * numWaypoints);
		currWaypoint = data.results[index];
		waypoints[i] = currWaypoint.geometry.location.lat + "," + currWaypoint.geometry.location.lng;
		//removes element from array and decrements the number of waypoints
		data.results.splice(index, 1);
		numWaypoints--;
	}
	console.log("Waypoints: " +waypoints);
	console.log("Num waypoints: " + waypoints.length);
	
}

//moved out of displayRoute due to card stacking issue.
var step;

function displayRoute(data){
	//var steps = data.routes[0].legs.steps;
	var distance = data.routes[0].legs[0].steps[0].distance.text;
	var duration = data.routes[0].legs[0].duration.text;
	var instructions = data.routes[0].legs[0].steps[1].html_instructions;
	instructions = instructions.replace(/(<([^>]+?)>)/ig,"");
	searchAndDestroyDestination(instructions);
	console.log(instructions);
  
	//begin vibe check and calls
  if(instructions !== lastInstruction){
    //new instruction set
    vibeFlag = false;
  }
  if(!vibeFlag){
	  vibrateWatchForTurn(transportMethod, distance, instructions);
  }
  
  lastInstruction = instructions;
  //end of vibe check and calls
  
	step = new UI.Card({
		title: instructions,
		subtitle: 'in ' + distance,
		body: 'ETA: ' + duration,
		scrollable: true
	});

	step.show();
	step.on('longClick', 'select', function(e){
		//navigator.geolocation.clearWatch(watchId);
		returnHome();
	});

}


function searchAndDestroyDestination(instructions){
	var split = instructions.split('Destination');
	split = split.slice(1);
	var phrase = split[0];
	return phrase;
}




function vibrateWatchForTurn(modeOfTransport, distance, instructions){
	var distanceData = distance.split(" ");
	var distanceNum = distanceData[0];
	var distanceUnit = distanceData[1];
	
	if(modeOfTransport == "driving"){
		if(distanceUnit == "ft" && distanceNum <= 250){
			vibeLeftOrRight(instructions);
		}
	}
	else if(modeOfTransport == "bicycling"){
		if(distanceUnit== "ft" && distanceNum <= 100){
			vibeLeftOrRight(instructions);
		}
	}
	else if(modeOfTransport == "walking"){
		if(distanceUnit== "ft" && distanceNum <= 30){
			vibeLeftOrRight(instructions);
		}
	}
}

function vibeLeftOrRight(instructions){
	var instructionsSet = instructions.split(" ");
	var direction = instructionsSet[1].toLowerCase();
	
	if(direction == "right"){
		Vibe.vibrate('short');
		Light.trigger();
	}
	
	else if(direction == "left"){
		Vibe.vibrate('double');
		Light.trigger();
	}
	vibeFlag = true;
}

function returnHome(){
	console.log("Waypoints Before Deletion: " + waypoints.length);
	console.log("Deleting Waypoints");
	waypoints = [];
	console.log("Waypoints After Deletion: " + waypoints.length);
	console.log("Returning home...");
	queryGoogleDirectionsAPI(getGoogleDirectionsLink());
}
