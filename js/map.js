	var base_latlng =  L.latLng(16.61673, 120.31737);

	var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
	var map = L.map('map').setView(base_latlng, 14);
	var circle_radius = 500;


	/*var baseIcon = L.icon({
		iconUrl: 'leaflet/images/marker-icon.png',
		shadowUrl: 'leaflet/images/marker-shadow.png',
		iconSize:[41,39],
		iconAnchor:[20,25],
		popupAnchor:[1,-15],
		shadowSize:[54,39]
	});*/
	 var toIcon = L.AwesomeMarkers.icon({
      icon: 'arrow-down',
      prefix: 'fa',
      markerColor: 'red'
     });

      var fromIcon = L.AwesomeMarkers.icon({
      icon: 'arrow-down',
      prefix: 'fa',
      markerColor: 'green'
     });

	

	var line_colors =['blue','red','orange','black'];

/*	var leg_route = {
		mode : "",
		from : "",
		to : "",
		

	}	

	var step = {
		direction : "",
		streetname : ""

	}
*/

	var route_layer = new L.layerGroup().addTo(map);

	

	var from_marker;
	var to_marker;
	
	L.tileLayer(osmUrl, {maxZoom: 20, minZoom: 0, attribution: osmAttrib}).addTo(map);

	var defaultBounds = new google.maps.LatLngBounds(
		new google.maps.LatLng(16.55640, 120.27742),
		new google.maps.LatLng(16.66843, 120.44994));

	var origin = document.getElementById('from');
	var destination = document.getElementById('to');

	var optionsAuto = {
		bounds: defaultBounds
	};

	//for osrm to find tricycle route
	var tryc_route = new L.Routing.control({	
		createMarker: function() { return null; }
	});


//autocomplete
var fromBox = new google.maps.places.Autocomplete(origin,optionsAuto);
var toBox = new google.maps.places.Autocomplete(destination,optionsAuto);

var toLatLng = null;
var fromLatLng = null;


fromBox.addListener('place_changed', function() {


	var place = fromBox.getPlace();

	fromLatLng = L.latLng(place.geometry.location.lat(),place.geometry.location.lng());
	if (place.geometry) {
		from_marker = L.marker(fromLatLng,{icon:fromIcon}).addTo(map);
	//if to_marker exist the call otp
		if (toLatLng != null){
			getRoute(fromLatLng,toLatLng);
		}
	}


});

toBox.addListener('place_changed', function() {
	var place = toBox.getPlace();
	var toLatLng = L.latLng(place.geometry.location.lat(),place.geometry.location.lng());
	if (place.geometry) {
		to_marker = L.marker(toLatLng,{icon:toIcon}).addTo(map);
		if (fromLatLng){
			getRoute(fromLatLng,toLatLng);
		}
	}  
});


var route_choices = [];


function getLegLayer(r,index){

    var layer = new L.layerGroup();
    //all legs inside route

	r.legs.forEach(function(l){

		var latlngs = decodePoints(l.points);
		var options = new line_options(index);
		if (l.mode == "WALK"){
			options.dashArray = '10,10';
		}

		layer.addLayer(L.polyline(latlngs,options));
	});

	return layer;

}




function getRoute(fromPlace,toPlace) {
	var dobj = new Date();
	var d = dobj.getDate();
	var m = dobj.getMonth();
	var y = dobj.getFullYear();
	var response = "";

	if (parseInt(d) < 10) d = '0'+(parseInt(d)).toString();
	
	if ((parseInt(m) + 1) < 10) m = '0'+(parseInt(m)+1).toString();
	else m = parseInt(m)+1;
	
	var mdy = m+'-'+d+'-'+y;
	


	var par =  

	{
		date:"05-01-2016",
		mode:"TRANSIT,WALK",


		fromPlace:latlng2str(fromPlace),
		toPlace:latlng2str(toPlace),

		time:"8:13am",

	}

	$.ajax({
		type: "GET",
		data : par,
			 // headers: {          
      		//	   Accept : "application/xml; charset=utf-8"         
  			//} , 
  			url: 'http://localhost:8080/otp/routers/default/plan',
  		})
	.done(function(data) {

	tryc_route.setWaypoints( [
			L.latLng(fromPlace),
			L.latLng(toPlace)
			]);

	
  	route_layer.addLayer(tryc_route);
		

		process_otp(data);
	})
	.fail(function() {
		alert("Ajax failed to fetch data")
	})
	return response;
};


function line_options(c){
	this.opacity= 1.0;
	this.lineJoin= 'round';
	this.dashArray= false;
	this.color= line_colors[c];
};


function route(duration,transfers,walkDistance)  {
	this.duration = duration;
	this.transfers = transfers;
	this.walkDistance = walkDistance;
	this.fare = 0;
	this.distance = 0;
	this.legs = [];

}

function route_leg(mode,from,to,points,distance)  {
	this.mode = mode;
	this.from = from;
	this.to = to;
	this.points = points;
	this.fare = 0;
	this.distance = distance;
	this.steps = [];

}

function step(direction,streetname){
   this.direction = direction;
   this.streetname = streetname;
}



function process_otp(data){

	if(data.plan) {
		var results = data.plan.itineraries;


	
		results.forEach(function(itinerary) {

			var r = new  route(formatDuration(itinerary.duration),itinerary.transfers,Math.round(itinerary.walkDistance));
			var total_fare = 0;
			var total_distance = 0;

			itinerary.legs.forEach(function(leg){

				var minDistance = 4000;
				var fare = 0.00;
				var base_fare = 8.50;

				var rl = new route_leg(leg.mode,leg.from.name,leg.to.name,leg.legGeometry.points,Math.round(leg.distance));
			

				if (leg.mode == "WALK"){
					//add steps
					
					leg.steps.forEach(function(s){
						rl.steps.push(new step(s.relativeDirection,s.streetName));	

					});

					}else{

					if (leg.distance > minDistance){
					   fare = base_fare + (((leg.distance - minDistance)/1000) * 1.50);
				    }

					}

					total_distance = total_distance + leg.distance;
					total_fare = total_fare + fare;
					
					rl.fare = fare.toFixed(2);

				   r.legs.push(rl);

						// zoom the map to the polyline
						//map.fitBounds(polyline.getBounds());
					});
         
				r.fare = total_fare;
				
				r.distance = Math.round(total_distance/1000);

			   route_choices.push(r);
					//push it here
					
				});

		

			} //data.plan

			//add tryc route


			
			var ctr = 0;
			 //build the routes on map
			 route_choices.forEach(function(r){
		
			 	route_layer.addLayer(getLegLayer(r,ctr));
               ++ctr;
			 });






			//build item
			build_menu_items(route_choices);

		}



		function build_menu_items(it){

			itineraries.set('it',it);
			

			//routes.set('it',[{leg:'one'},{leg:'two'},{leg:'three'}]);

		}

		var tricycle_routes = new Ractive({
			 el: '#tricycle_list',
		      // We could pass in a string, but for the sake of convenience
		      // we're passing the ID of the <script> tag above.
		      template: '#tricycle_template',
		      // Here, we're passing in some initial data
		      data: {  tricycle:[] }
		});

		var itineraries = new Ractive({
		      // The `el` option can be a node, an ID, or a CSS selector.
		      el: '#it_list',

		      // We could pass in a string, but for the sake of convenience
		      // we're passing the ID of the <script> tag above.
		      template: '#template_it',

		      // Here, we're passing in some initial data
		      data: {  it:[] }
		  });

			var itinerary = new Ractive({
		      // The `el` option can be a node, an ID, or a CSS selector.
		      el: '#leg_list',

		      // We could pass in a string, but for the sake of convenience
		      // we're passing the ID of the <script> tag above.
		      template: '#template_legs',

		      // Here, we're passing in some initial data
		      data: {  legs:[] }
		  });

		itinerary.on({
			click: function(event,index){
					// zoom the map to the polyline
						//map.fitBounds(polyline.getBounds());
						alert("click");
			}

		});	
	

		itineraries.on({
			hover: function(event, index) {
				//remove all


				route_layer.clearLayers();

				route_layer.addLayer(getLegLayer(route_choices[index],index));
				
		  		 itinerary.set('legs',route_choices[index].legs);
			
				},

			over: function(event, index){
					route_layer.clearLayers();
alert("over and out");
					var ctr = 0;
			 //build the routes on map
					 route_choices.forEach(function(r){
				console.log("1 route");
					 	route_layer.addLayer(getLegLayer(r,ctr));
		               ++ctr;
					 });
							
					}	
		
			
		});

		tricycle_routes.on({
				hover: function(event, index) {
				//remove all


				route_layer.clearLayers();

				
				
		  	    route_layer.addLayer(tryc_route);
			
				},
		


		});

		tryc_route.on('routesfound',function(e){
		    console.log(e.routes);
		    tricycle_routes.set('tricycle',e.routes);
	    });





