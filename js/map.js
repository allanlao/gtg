	var base_latlng =  L.latLng(16.61673, 120.31737);

	var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	//var osmUrl = 'http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png';
	var osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
	var map = L.map('map').setView(base_latlng, 14);
	var circle_radius = 500;

//  var osmGeocoder = new L.Control.OSMGeocoder();

     //   map.addControl(osmGeocoder);
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

	var jeepIcon = L.AwesomeMarkers.icon({
		icon: 'cab',
		prefix: 'fa',
		markerColor: 'green'
	});

	var busIcon = L.AwesomeMarkers.icon({
		icon: 'bus',
		prefix: 'fa',
		markerColor: 'green'
	});

	var tricIcon = L.AwesomeMarkers.icon({
		icon: 'motorcycle',
		prefix: 'fa',
		markerColor: 'green'
	});


	var jeep = L.icon({
    iconUrl: 'icons/jeep.png',
     iconAnchor:   [0, 0], // point of the icon which will correspond to marker's location
  

});

	

	var line_colors =['blue','red','orange','black'];



	var itinerary_layer = new L.layerGroup().addTo(map);

	

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
    		options.dashArray = '5,5';
    	}

    	layer.addLayer(L.polyline(latlngs,options));

    });

    return layer;

}

function p2Polyline(leg,index){

	var latlngs = decodePoints(leg.legGeometry.points);
	var options = new line_options(index); 
	if (leg.mode == "WALK"){
		options.dashArray = '10,10';
	}
	return 	L.polyline(latlngs,options);

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


  //	itinerary_layer.addLayer(tryc_route);


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




function o_itinerary(duration,transfers,walkDistance)  {
	this.duration = duration;
	this.transfers = transfers;
	this.walkDistance = walkDistance;
	this.fare = 0;
	this.distance = 0;
	this.legs = [];
	this.layer = new L.layerGroup();


}

function o_itinerary_leg(mode,from,to,polyline,distance)  {
	this.mode = mode;
	this.from = from;
	this.to = to;
	this.polyline = polyline;
	this.fare = 0;
	this.distance = distance;
	this.steps = [];
	this.route = "";

}

function o_step(direction,streetname){
	this.direction = direction;
	this.streetname = streetname;
}



function process_otp(data){

	if(data.plan) {
		var results = data.plan.itineraries;


   var it_ctr = 0;
		results.forEach(function(itinerary) {
			
			var o_it = new  o_itinerary(formatDuration(itinerary.duration),itinerary.transfers,Math.round(itinerary.walkDistance));
			var total_fare = 0;
			var total_distance = 0;

			itinerary.legs.forEach(function(leg){
				var leg_ctr = 0;
				var minDistance = 4000;
				var fare = 0.00;
				var base_fare = 8.50;
				var fare_km = 1.50;

				var o_it_leg = new o_itinerary_leg(leg.mode,leg.from,leg.to,leg.legGeometry.points,Math.round(leg.distance));
				console.log("leg route" + leg.route);
				o_it_leg.route = leg.route;

				if (leg.mode == "WALK"){
					//add steps
					
					leg.steps.forEach(function(s){
						o_it_leg.steps.push(new o_step(s.relativeDirection,s.streetName));	

					});

				}else{

					if (leg.distance > minDistance){
						fare = base_fare + (((leg.distance - minDistance)/1000) * fare_km);
					}else{
						fare = base_fare;
					}

				}

				total_distance = total_distance + leg.distance;
				total_fare = total_fare + fare;

				o_it_leg.fare = fare.toFixed(2);
			
				o_it_leg.polyline = p2Polyline(leg,it_ctr);
				o_it.layer.addLayer(p2Polyline(leg,it_ctr));
				if (leg.mode == "WALK!"){
				  o_it.layer.addLayer(L.marker(L.latLng(leg.from.lat,leg.from.lon),{icon:jeepIcon}));
			    }else	if (leg.mode != "BUS"){
			    	o_it.layer.addLayer(L.marker(L.latLng(leg.from.lat,leg.from.lon),{icon:jeep}));
			    }

				o_it.legs.push(o_it_leg);

						// zoom the map to the polyline
						//map.fitBounds(polyline.getBounds());
						++leg_ctr;
					});
			++it_ctr;
			o_it.fare = total_fare;


			o_it.distance = Math.round(total_distance/1000);

			route_choices.push(o_it);
					//push it here
					
				});

		

			} //data.plan

			//add tryc route


			
			
			 //build the routes on map
			 console.log(route_choices);
			 route_choices.forEach(function(r){

			 	itinerary_layer.addLayer(r.layer);

			 });






			//build item
			build_menu_items(route_choices);

		}



		function build_menu_items(it){

			r_itineraries.set('it',it);
			

			//routes.set('it',[{leg:'one'},{leg:'two'},{leg:'three'}]);

		}

		var r_tricycle_routes = new Ractive({
			el: '#tricycle_list',
		      // We could pass in a string, but for the sake of convenience
		      // we're passing the ID of the <script> tag above.
		      template: '#tricycle_template',
		      // Here, we're passing in some initial data
		      data: {  tricycle:[] }
		  });

		var r_itineraries = new Ractive({
		      // The `el` option can be a node, an ID, or a CSS selector.
		      el: '#it_list',

		      // We could pass in a string, but for the sake of convenience
		      // we're passing the ID of the <script> tag above.
		      template: '#template_it',

		      // Here, we're passing in some initial data
		      data: {  it:[] }
		  });

		var r_itinerary = new Ractive({
		      // The `el` option can be a node, an ID, or a CSS selector.
		      el: '#leg_list',

		      // We could pass in a string, but for the sake of convenience
		      // we're passing the ID of the <script> tag above.
		      template: '#template_legs',

		      // Here, we're passing in some initial data
		      data: {  legs:[] }
		  });

		r_itinerary.on({
			click: function(event,index){
					// zoom the map to the polyline
						//map.fitBounds(polyline.getBounds());
							
						var l = this.get('legs');
						map.fitBounds(l[index].polyline.getBounds(),{padding: [50, 50], maxZoom:18});


					}

				});	


		r_itineraries.on({
			hover: function(event, index) {
				//remove all


				itinerary_layer.clearLayers();

				itinerary_layer.addLayer(route_choices[index].layer);

				map.setView(base_latlng, 14);
				r_itinerary.set('legs',route_choices[index].legs);

			},

			over: function(event, index){
				itinerary_layer.clearLayers();
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

		r_tricycle_routes.on({
			hover: function(event, index) {
				//remove all


				itinerary_layer.clearLayers();

				itinerary_layer.addLayer(tryc_route);

			},

		});

		tryc_route.on('routesfound',function(e){
			console.log(e.routes);
			tricycle_routes.set('tricycle',e.routes);
		});





