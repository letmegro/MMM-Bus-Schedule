
const routeStops = "https://retro.umoiq.com/service/publicJSONFeed?command=routeConfig&";
const predictions = "https://retro.umoiq.com/service/publicJSONFeed?command=predictions&";
/*
Notes: add icons to each bus and make CSS tweaks to make it look nice
*/
Module.register("MMM-Bus-Schedule", {
  // Default module config.
  defaults: {
	header: "",
	route: 2,
	lat: 0,
	lon: 0,
	agency: "ttc",
	maxDisplay: 2,
  },
	vars: {
		minutes: "Loading...",
		routeTitle: "",
		stopTitle: "",
		url: "modules/MMM-Bus-Schedule/images/bus.png",
	},
	start: function() {
		let jsonList = {};
		//updates every 2 seconds and takes up to 2 seconds to initiate
		var timer = setInterval(()=>{
			this.updateDom();
			jsonList = fetchPrediction(this.config.agency, this.config.route, this.config.lat, this.config.lon).then(data => {return data});
			//header
			let h = retrieveHeader(jsonList, this.config.header);
			Promise.all([h]).then(res => {this.config.header = res[0];});
			//title
			let t = retrieveRouteTitle(jsonList, this.vars.routeTitle);
			Promise.all([t]).then(data => {this.vars.routeTitle = data[0];});
			//name of stop intersections/title
			let st = retrieveStopTitle(jsonList, this.vars.stopTitle);
			Promise.all([st]).then(data => {this.vars.stopTitle = data[0];});
			let m = retrieveMinutes(jsonList, this.vars.minutes, this.vars.maxDisplay);
			Promise.all([m]).then(data => {this.vars.minutes = data[0]; }).catch(error => Log.log("Nothing to retrieve"));
		}, 2000);
	},
	getStyles: function() {
		return ['scripts.css', 'font-awesome.css'];

	},
	
  // Override dom generator.
	getDom: function () {
		const wrapper = document.createElement("div");
		if(this.vars.routeTitle == "") {
			wrapper.innerHTML = "Initiating Bus Schedule";
			return wrapper;
		}
		const innerHeaderBox = document.createElement("div");
		//body of the box which holds all information about arrival times
		const innerBody = document.createElement("div");
		innerHeaderBox.innerHTML = this.vars.routeTitle;
		const stopName = document.createElement("div");
		stopName.innerHTML = this.vars.stopTitle + "\nArrivals:\n";
		innerBody.appendChild(stopName);
		//hold arrival times
		const arrivals = document.createElement("div");
		arrivals.id = "arrivals";
		try{
			this.vars.minutes.forEach(arrival => {
				const time = document.createElement("div");
				var image = document.createElement("img");
				image.src = this.vars.url;
				image.className = "bus";
				time.appendChild(image);
				time.innerHTML = arrival + " Minutes";
				arrivals.appendChild(time);
			});
		}catch(e){Log.log(e)};
		innerBody.appendChild(arrivals);
		wrapper.appendChild(innerHeaderBox);
		wrapper.appendChild(innerBody);
		return wrapper;
	},
	getHeader: function() {
		return this.config.header;
	},
	
	
});
//fetching data
async function fetchPrediction(agency, route, oLat, oLon) {
	let obj = "";
	//fetching route stops
	const promise = new Promise((resolve,reject) => {
		
		resolve(fetch(routeStops+"a="+agency+"&r="+route).then(
			response => response.json()
		));
	});
	//finding the closest stop to user location
	let stopID = await Promise.all([promise]).then(data => {
		let stops = data[0]["route"]["stop"];
		let closestStop = Number.MAX_VALUE;
		let stopNumber = 0;
		stops.forEach(stop => {
			let d = haversineCoordinateDistance(oLat, stop["lat"], oLon, stop["lon"]);
			if(d < closestStop){
				closestStop = d;
				if(stop["stopId"] !== undefined){
					stopNumber = stop["stopId"];
				}
			}
		});
		
		return stopNumber;

	}).catch(error => Log.log(agency + " Promise couldn't be made"));
	//call predictions API
	const promise2 = new Promise((resolve,reject) => {
		
		resolve(fetch(predictions+"a="+agency+"&stopId="+stopID).then(
			response => response.json()
		));
	}).catch(error => Log.log("promise 2 could not be made"));
	//return a list wrapped in a promise
	return await Promise.all([promise2]).then(data => {
		return data[0]["predictions"];
	}).catch(error => Log.log("Could not fetch any data, data may not exist."));
}



//retrieve header - UPDATED JUN/24/25
async function retrieveHeader(list, header){
	let newHeader = "";
	newHeader = await Promise.all([list]).then(res => {return res[0]["agencyTitle"];}).catch(error => Log.log("couldn't retrieve"));
	if(newHeader !== undefined){
		return newHeader;
	}
	else {
		return routeTitle;
	}
}
//retrieve inner title - UPDATED JUN/25/25
async function retrieveRouteTitle(list, routeTitle){
	let newTitle = "";
	newTitle = await Promise.all([list]).then(res => { return res[0]["direction"]["title"];}).catch(error => Log.log("couldn't retrieve"));
	if(newTitle !== undefined){
		return newTitle;
	}
	else {
		return routeTitle;
	}
	
}
//retrieve update on minutes - UPDATED JUN/25/25
async function retrieveMinutes(list, minutes, max){
	let newMinutes = "";
	newMinutes = await Promise.all([list]).then(res => { return res[0]["direction"]["prediction"];}).catch(error => Log.log("couldn't retrieve"));
	if(newMinutes !== undefined){
		let arrivals = [];
		//maximum 2
		newMinutes.forEach((arrival, i) => {
			if(i == max){
				return false;
			}
			arrivals.push(arrival["minutes"]);
		});
		return arrivals;
	}
	else {
		return minutes;
	}
	
}
//retrieve stop title - UPDATED JUN/25/25
async function retrieveStopTitle(list, stopTitle) {
	let newStopTitle = "";
	newStopTitle = await Promise.all([list]).then(res => { return res[0]["stopTitle"]; }).catch(error => Log.log("couldn't retrieve"));
	if(newStopTitle !== undefined){
		return newStopTitle;
	}
	else {
		return stopTitle;
	}
}



//calculate distance between user input and transit stop
function haversineCoordinateDistance(lat1, lat2, lon1, lon2){
	const degPI = Math.PI / 180;
	//rad conversion
	const rLat1 = lat1 * degPI;
	const rLat2 = lat2 * degPI;
	const rLon1 = lon1 * degPI;
	const rLon2 = lon2 * degPI;
	
	//earth radius in meters
	const earthR = 6371000;
	//diff in coords in rad
	const dlat = rLat2 - rLat1;
	const dlon = rLon2 - rLon1;
	
	const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
		Math.cos(rLat1) * Math.cos(rLat2) *
		Math.sin(dlon / 2) * Math.sin(dlon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const d = earthR * c;
	return d;
}






