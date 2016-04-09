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
				title: 'Biking'
			},{
				title: 'Walking'
			}]
		}]
	});
	vehicle.show();
	vehicle.on('select', function(e){
		console.log('You chose ' + e.item.title);
		transportMethod = e.item.title;
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
		title: 'You have chosen to go on a trip lasting ' + lengthOfTrip + ' by ' + transportMethod,
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

function success(pos){
	console.log('lat = ' + pos.coords.latitude + 'lon = ' + pos.coords.longitude);
	userLat = pos.coords.latitude;
	userLong = pos.coords.longitude;
}

function error(err){
	console.log('location error');
}

var options = {
	enableHighAccuracy: true,
	maximumAge: 10000,
	timeout: 10000
};

navigator.geolocation.getCurrentPosition(success, error, options);


var origin = userLat + ',' + userLong;
var destination = 'Northfield,MN';
var waypoints = ['Plymouth,MN', 'Duluth,MN', 'Isle,MN'];
console.log(origin);

function getGoogleDirectionsLink(origin, destination, waypoints){
	var basicURL = "https://maps.googleapis.com/maps/api/directions/json?origin=";
	basicURL += origin;
	basicURL+= "&destination" + destination;
	basicURL+="&waypoints";
	
}

ajax(
	{
		url: "https://maps.googleapis.com/maps/api/directions/json?origin=" + origin + "&destination=" + destination + "&key=" + APIKey,
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




