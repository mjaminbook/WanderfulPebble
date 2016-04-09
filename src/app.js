/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');

var transportMethod;
var lengthOfTrip;
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
				title: '15 minutes'
			},{
				title: '30 minutes'
			},{
				title: '45 minutes'
			},{
				title: '1 hour'
			},{
				title: '1 hour, 15 minutes'
			},{
				title: '1 hour, 30 minutes'
			},{
				title: '1 hour, 45 minutes'
			},{
				title: '2 hours'
			}]
		}]
	});
	time.show();
	time.on('select', function(e) {
		console.log('You chose ' + e.item.title);
		lengthOfTrip = e.item.title;
		confirm();
	});
}

function confirm(){
	var confirm = new UI.Card({
		title: 'Your trip lasts ' + lengthOfTrip + ' by ' + transportMethod,
		subtitle: 'Press Select to begin!'
	});
	confirm.show();
	confirm.on('click', 'select', function(e){
		beginTrip();
	});
}
//end of menu

function beginTrip(){
	console.log("Trip has begun!");
}

var ajax = require('ajax');
var APIKey = 'AIzaSyCqbr5FiJlB0I3W35dtXS43yhmgQ5fLRRM';

var userLat;
var userLong;
var origin;

// function success(pos){
// 	console.log('lat = ' + pos.coords.latitude + 'lon = ' + pos.coords.longitude);
// 	userLat = pos.coords.latitude;
// 	userLong = pos.coords.longitude;
//   origin = userLat+","+userLong;
// }

// function error(err){
// 	console.log('location error');
// }

// var options = {
// 	enableHighAccuracy: true,
// 	maximumAge: 10000,
// 	timeout: 10000
// };

navigator.geolocation.getCurrentPosition(success, error, options);

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

// Get location updates
watchId = navigator.geolocation.watchPosition(success, error, options);

//window.setTimeout(1000);
var destination = 'Northfield,MN';
var waypoints = ['Plymouth,MN', 'Duluth,MN', 'Isle,MN'];
console.log(origin);

function getGoogleDirectionsLink(){
	var basicURL = "https://maps.googleapis.com/maps/api/directions/json?origin=";
//   to test
	basicURL += origin;
	basicURL+= "&destination=" + destination;
	basicURL+="&waypoints=";
  for(var point in waypoints){
    basicURL+=waypoints[point]+"|via:";
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
  		console.log('Succesfully gathered data!');
  		var time = data.routes[0].legs[0].duration.text;
  		console.log(time);
  	},
  	function(error){
  		console.log('Failed to gather data :(');
  	}
  );
}





