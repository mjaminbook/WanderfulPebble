var dep = require('https://maps.googleapis.com/maps/api/js?key=AIzaSyBKu72O30sBJI78lw7h1DWI3ApwWTgTLl8&libraries=places');

var placeResults;
var durationResults;
//TEMP DATA FOR TESTING
var userEnteredTime = 60;
var method = 1;
//method == 1 : walking
//method == 2 : biking
// default : driving
//----
var distanceResults;
var destinationResults;
var driving = 50;
var walking = 2;
var biking = 10;


dep.performSearch();{
  
    //FIX BOUNDS
    if(method == 1){
      var request = {
      bounds: userEnteredTime*walking/60,
      keyword: 'best view'
      };
    }
    else if(method == 2){
      var request = {
      bounds: userEnteredTime*biking/60,
      keyword: 'best view'
      };
    }
  else{
    var request = {
      bounds: userEnteredTime*driving/60,
      keyword: 'best view'
      };
  }
  dep.service.radarSearch(request, callback);
}

dep.callback(dep.results, dep.status);{


  if (dep.status !== dep.google.maps.places.PlacesServiceStatus.OK) {
    console.error(dep.status);
    return;
  }
  for (var i = 0; i < dep.results.length; i++) {
     placeResults.push(dep.results[i]);
  }
}

//----------------

//THINGS TO NOTE: 
//Maximum of 25 origins or 25 destinations per request; and
//At most 100 elements (origins times destinations) per request.
var origin = dep.locationFound;
dep.service = new dep.google.maps.DistanceMatrixService();
dep.service.getDistanceMatrix(
  {
    origins: origin,
    destinations: placeResults,
    travelMode: dep.google.maps.TravelMode.DRIVING,
    transitOptions: dep.TransitOptions,
    drivingOptions: dep.DrivingOptions,
    unitSystem: dep.UnitSystem,
    avoidHighways: Boolean,
    avoidTolls: Boolean,
  }, callback);

function callback(response, status) {
  if (status == dep.google.maps.DistanceMatrixStatus.OK) {
    var origins = response.originAddresses;
    var destinations = response.destinationAddresses;

    for (var i = 0; i < origins.length; i++) {
      for (var j = 0; j < destinations.length; j++) {
        var element = destinations[j];
        var distance = element.distance.text;
        var duration = element.duration.text;

        if(duration > userEnteredTime-3 && duration <= userEnteredTime){
          distanceResults.push(distance);	
          durationResults.push(duration);
          destinationResults.push(element);
        }
//Do we need to convert duration from text to # form?
      }
    }
  }
}
