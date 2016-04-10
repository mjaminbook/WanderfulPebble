## Inspiration

Wanderlust. The burning desire to get out and explore the world, to discover new places, and maybe even find out something about yourself along the way. It's a part of the human condition. At some point in our lives, we all want to just go and get away from it all, even if just for a short while. However, how are we supposed to truly discover new places, if we don't know they exist yet? The idea of following some uncharted path along a journey to new sights is something technology can help with, but hasn't yet to this point. We built Wanderful to fill this void. We built it for the late night drives with the windows down out to the middle of nowhere; for the Sunday afternoon walks during the first thaw of the Spring; for the undiscovered places in the wonderful world around you. 

## What it does

Wanderful allows you to take walking, biking, or driving trips to nearby areas from the convenience of your watch. We allow you, the user, to select a method of transport and an amount of time you'd like to spend on your journey. Then we create a path for you to follow, pushing directions straight to your Pebble watch. It leads you by a number of unknown waypoints in one big loop, dropping you right back off at your starting point. 

The app comes with simple notifications and alerts (one vibration for a right turn, two for a left turn) that allow you to experience your surroundings far more than you need to experience the distracting light of your screens. 

It also comes built in with a 'home' function. At any point along your trip, if you're feeling a bit weary, you can initiate the Return Home feature by holding down the Pebble watch's select button. This will immediately drop the remainder of your preplanned route and plot a new one for you, straight back to your initial position. 

## How we built it

We use the Pebble.js library to write the app for the Pebble watch. We also integrated with Google's Places and Directions APIs in order to create our routes. 

## Challenges we ran into

Geolocation proved to be a big challenge. We were expecting that. We were not expecting though that creating a coherent route through all of the points would present such a large challenge. Additionally, part of our group spent a significant amount of time constructing an Android companion application that would allow users to also see their paths from their smartphones. Sadly, it turned out that Pebble.js does not have the capability at this time to work with Android so we ended up needing to scrap this part of the project. 

## Accomplishments that we're proud of

We built a brand new application that we really wanted to exist on a device we had never used before (Pebble) interacting with APIs we had never accessed before (Google Maps) using a language that we only knew fairly well (Javascript). 

## What we learned

We learned a lot about geolocation and how to constantly update positions through Google's APIs. 
We also learned a lot about these APIs in general and how to use many of their nicer functions (optimize: true for creating a route through waypoints) 
We learned more about Javascript and asynchronous programming. 
We learned how to use the Pebble Watch and how to write an application for it. 
We learned how easy it is to run over your daily API request limit when sending one location update request per second :). 

## What's next for Wanderful

Many of us definitely want to continue this project! In the future, we'd like to port the application to Android and iOS so that the large portions of the population without smartwatches (including us) would have the opportunity to use it. We'd like to add some more features such as the ability to add time to your route mid-travel as well as saving and sharing routes you enjoyed. We also feel that the largest amount of potential comes from the route building function itself. With more time, we might be able to tune this to create more dynamic routes that really take users places they've never been before and give them the opportunity to experience the wonderful world around them! 

