//Todo: Make data private
//Todo: Delete markers
MapMarkers = new Mongo.Collection('map');
// var key = Meteor.settings.google.map.key;

if (Meteor.isClient) {
    Meteor.startup(function () {

        Meteor.subscribe("Users");
        Meteor.subscribe("MapMarkers");

        if (navigator.geolocation) {
            console.log('Getting users location.');
            navigator.geolocation.getCurrentPosition(function (geo) {
                Session.set('mapLat', geo.coords.latitude);
                Session.set('mapLong', geo.coords.longitude);
                //Localhost
                GoogleMaps.load();
                ///////////////////////////////////////////////////////////////
                //Other Origins - Must be secured!
                //In short, Google recently changed the terms of use of its Google Maps APIs; if you were already using them on a website (different from localhost) prior to June 22nd, 2016, nothing will change for you; otherwise, you need an API key in order to fix your error. The free API key is //valid up to 25,000 map loads per day. :(
                ///////////////////////////////////////////////////////////////
                //Run -> chrome --unsafely-treat-insecure-origin-as-secure="http://{yourOwnHost}:{port}"  --user-data-dir=C:\tmp\testprofile
                
                //Retrieve the key from https://console.developers.google.com/
                //GoogleMaps.load({ v: '3', key: Meteor.settings.public.google.map.key, libraries: 'geometry,places' });
            });
        }

    });

    Template.body.helpers({
        //Map stuff
        exampleMapOptions: function () {
            // Make sure the maps API has loaded
            if (GoogleMaps.loaded()) {
                // Map initialization options
                return {
                    center: new google.maps.LatLng(Session.get('mapLat'), Session.get('mapLong')),
                    zoom: 100  // ? times - default 10
                };

            }
        }
    });

    Template.body.onCreated(function () {
        // We can use the `ready` callback to interact with the map API once the map is ready.
        GoogleMaps.ready('exampleMap', function (map) {

            console.log(map.instance.getBounds());

            // Add a marker to the map once it's ready
            //add coordinates to DB on map click
            google.maps.event.addListener(map.instance, 'click', function (event) {
                // todo: Add accuracy logic - According to the google geo location doc, 
                //{
                //  "location": {
                //    "lat": 51.0,
                //    "lng": -0.1
                //  },
                //  "accuracy": 1200.4
                // }
                var pokemon = Session.get('selectedPokemon') || 'pikachu'
                var now = new Date();
                var newMarker = {
                    createdAt: now,
                    name: pokemon,           
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng(),
                    accuracy: now.getTime()/1000
                };
                Meteor.call('insertMarker', newMarker);
                //todo: remove console log
                console.log(event);
            });

            //google.maps.event.addListener(map.instance,  'rightclick',  function(mouseEvent) { alert('Right click on map triggered'); });

            //markers array
            var markers = {};
         
            //observe the db
            MapMarkers.find().observe({
                added: function (document) {
                    var pokemon = document.name || 'pikachu';
                    //var imgIcon = '/img/pokemon/pikachu.png';
                    var pinIcon = new google.maps.MarkerImage(
                        '/img/pokemon/'+ pokemon +'.png',
                        null, /* size is determined at runtime */
                        null, /* origin is 0,0 */
                        null, /* anchor is bottom center of the scaled image */
                        new google.maps.Size(45, 45)  /* scaledSize : new google.maps.Size(width, height) */
                    );
                    
                    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                    //Note: Marker shadows were removed in version 3.14 of the Google Maps JavaScript API. Any shadows specified programmatically will be ignored.
                    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                    // var pinShadow = new google.maps.MarkerImage(
                    //     "http://chart.apis.google.com/chart?chst=d_map_pin_shadow",
                    //     null,
                    //     null,
                    //     /* Offset x axis 33% of overall size, Offset y axis 100% of overall size */
                    //     new google.maps.Point(40, 110),
                    //     new google.maps.Size(120, 110));
                    var marker = new google.maps.Marker({
                        name: pokemon,
                        draggable: true,
                        raiseOnDrag: true,
                        animation: google.maps.Animation.DROP,
                        position: new google.maps.LatLng(document.lat, document.lng),
                        map: map.instance,
                        id: document._id,
                        icon: pinIcon
                        // labelContent: "Pokemon:{Name}",
                        // labelAnchor: new google.maps.Point(22, 0),
                        // labelClass: "labels", // the CSS class for the label
                        // labelStyle: {opacity: 0.75}
                    });
                    // var shadow = new MarkerShadow('myLatLng', pinShadow, 'map');
                    // marker.bindTo('map', shadow, 'map');

                    //update marker POS on drag of marker
                    var now = new Date();
                    google.maps.event.addListener(marker, 'dragend', function (event) {
                        var obj = {
                                createdAt: now, 
                                lat: event.latLng.lat(),
                                lng: event.latLng.lng(),
                                accuracy: now.getTime()/1000
                        };
                        Meteor.call("updateMarker", marker.id, obj)
                    });

                    // PC only: remove marker POS on right click
                    google.maps.event.addListener(marker, 'rightclick', function (mouseEvent) {
                        //alert('Right click on marker triggered');
                        Meteor.call("removeMarker", marker.id);
                    });

                    markers[document._id] = marker;
                },
                //update map with database when the marker is updated
                changed: function (newMarker, oldMarker) {
                    markers[newMarker._id].setPosition({ lat: newMarker.lat, lng: newMarker.lng });
                },

                //delete marker from map when deleted
                removed: function (oldMarker) {
                    markers[oldMarker._id].setMap(null);
                    google.maps.event.clearInstanceListeners(markers[oldMarker._id]);
                    //delete from JS array.
                    delete markers[oldMarker._id];
                }
            });


        });
    });

    //Floating panel view
    //todo: instant search bar -> https://meteorhacks.com/implementing-an-instant-search-solution-with-meteor/
    Template.floatingPanel.helpers({
        "pokemons": function() {
            //Icon names
            return ['abra','aerodactyl','alakazam','arbok','arcanine','articuno','beedrill','bellsprout','blastoise','bulbasaur','butterfree','caterpie','chansey','charizard','charmander','charmeleon','clefable','clefairy','cloyster','cubone','dewgong','diglett','ditto','dodrio','doduo','dragonair','dragonite','dratini','drowzee','dugtrio','eevee','ekans','electabuzz','electrode','exeggcute','exeggutor','farfetch','fearow','flareon','gastly','gengar','geodude','gloom','golbat','goldeen','golduck','golem','graveler','grimer','growlithe','gyarados','haunter','hitmonchan','hitmonlee','horsea','hypno','ivysaur','jigglypuff','jolteon','jynx','kabuto','kabutops','kadabra','kakuna','kangaskhan','kingler','koffing','krabby','lapras','lickitung','machamp','machoke','machop','magikarp','magmar','magnemite','magneton','mankey','marowak','meowth','metapod','mew','mewtwo','moltres','mrmime','muk','nidoking','nidoqueen','nidoranf','nidoranm','nidorina','nidorino','ninetales','oddish','omanyte','omastar','onix','paras','parasect','persian','pidgeot','pidgeotto','pidgey','pikachu','pinsir','pokeball','poliwag','poliwhirl','poliwrath','ponyta','porygon','primeape','psyduck','raichu','rapidash','raticate','rattata','rhydon','rhyhorn','riolu','sandshrew','sandslash','scyther','seadra','seaking','seel','shellder','slowbro','slowpoke','snorlax','spearow','squirtle','starmie','staryu','tangela','tauros','tentacool','tentacruel','vaporeon','venomoth','venonat','venusaur','victreebel','vileplume','voltorb','vulpix','wartortle','weedle','weepinbell','weezing','wigglytuff','zapdos','zubat'];
        }
    });

    Template.floatingPanel.events({
        "change #pokemon-select": function (event, template) {
            var pokemon = $(event.currentTarget).val();
            // additional code to do what you want with the pokemon
            // update the marker icon
            Session.set('selectedPokemon', pokemon);
            console.log("Pokemon: ", Session.get('selectedPokemon'));
        }
    });
    // UI.registerHelper('selected', function(key, value){
    //    return key == value? {selected:'selected'}: '';
    // });

    //Markers list view
    Template.MapMarkersList.helpers({
        "mapMarker": function () {
            if (GoogleMaps.loaded()) {
                return MapMarkers.find().fetch().reverse();
            }
        }
    });

    //events for list view items
    Template.MapMarkersList.events({
        'mouseenter li': function (e) {
            //get the lat and long
            var LatLong = new google.maps.LatLng(this.lat, this.lng);
            //set the map center but wait a little
            setTimeout(function () {
                GoogleMaps.maps.exampleMap.instance.setCenter(LatLong);
            }, 500);

        }
    });
}

Meteor.methods({
    //todo: Server storage protection logic
    cleanOldMakers: function () {
        var now = new Date();
        var ts = now.getTime() / 1000 - 300; //? secs ago
        //MapMarkers.remove({createdAt: { $lte: AnHourAgo }});
        // var num = MapMarkers.find({accuracy: { $lte: ts }},{fields: {'_id':1}}).count(); //list 0 - ?
        // if(num>0){
        //     console.log('Cleaning '+ target.length +' docs from DB at:' + now);
        //     MapMarkers.remove({accuracy: { $lte: ts }});   
        // }   
       console.log('Cleaning DB at:' + now);
       // todo: archive the data for analysis   
       MapMarkers.remove({accuracy: { $lte: ts }});          
    },
    insertMarker: function(obj){
        MapMarkers.insert(obj);
    },
    removeMarker: function(id){
        console.log('remove marker id:' + id);
        MapMarkers.remove(id);
    },
    updateMarker: function(id, obj){
        console.log('update marker id:' + id);
        MapMarkers.update(id, {
            $set:obj 
     });
    }
    // getMarker: function(id){
    //     //name only
    //     console.log('get marker id:' + id);
    //     return MapMarkers.find({_id: id}, {fields: {'name':1}}).fetch()[0].name;
    // }
});

if (Meteor.isServer) {
    Meteor.startup(function () {

        Meteor.publish("MapMarkers", function() {
          return MapMarkers.find();
        });
        Meteor.publish("Users", function() {
          return Meteor.users.find();
        });
        // code to run on server at startup
        //////////////////////////////////////////////////////////
        // Setup a scheduler job to clean up the markers map db
        //way 1 Mongo native: db.log_events.createIndex( { "createdAt": 1 }, { expireAfterSeconds: 3600 } )
        //way 2 Cron job:  percolate:synced-cron (https://atmospherejs.com/percolate/synced-cron)
        //way 3 Meteor native: Meteor.setTimeout().
        //////////////////////////////////////////////////////////

        // 1. cleaner runs every 30min
        // 2. remove/archive  docs older than 30min
        Meteor.setInterval(function() { 
            Meteor.call('cleanOldMakers');
        }, 300000); // every ? ms
    });
}
