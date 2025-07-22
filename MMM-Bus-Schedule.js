
const routeStops = "https://retro.umoiq.com/service/publicJSONFeed?command=routeConfig&";
const predictions = "https://retro.umoiq.com/service/publicJSONFeed?command=predictionsForMultiStops&";
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
		stopInfoOne: {
			minutes: "",
			routeTitle: "",
			stopTitle: "",
		},
		stopInfoTwo: {
			minutes: "",
			routeTitle: "",
			stopTitle: "",
		},
		url: "/modules/MMM-Bus-Schedule/images/bus.png",
	},
	start: function() {
		let jsonList = {};
		//updates every 2 seconds and takes up to 2 seconds to initiate
		var timer = setInterval(()=>{
			this.updateDom();
			jsonList = fetchPrediction(this.config.agency, this.config.route, this.config.lat, this.config.lon).then(data => {return data});
			//header
			
			let h = retrieveHeader(jsonList.then(data => {return data[0]}), this.config.header);
			h.then(res => {this.config.header = res;});
			//start of info 1 segment---------------------------------
			//title
			let t = retrieveRouteTitle(jsonList.then(data => {return data[0]}), this.vars.stopInfoOne.routeTitle);
			t.then(data => {this.vars.stopInfoOne.routeTitle = data;});

			//name of stop intersections/title
			let st = retrieveStopTitle(jsonList.then(data => {return data[0]}), this.vars.stopInfoOne.stopTitle);
			st.then(data => {this.vars.stopInfoOne.stopTitle = data;});

			//array of predictions
			let m = retrieveMinutes(jsonList.then(data => {return data[0]}), this.vars.stopInfoOne.minutes, this.config.maxDisplay);
			m.then(data => {this.vars.stopInfoOne.minutes = data; }).catch(error => Log.log("Nothing to retrieve"));
			//end of info one segment---------------------------------
			
			//start of info 2 segment---------------------------------
			//title
			t = retrieveRouteTitle(jsonList.then(data => {return data[1]}), this.vars.stopInfoTwo.routeTitle);
			t.then(data => {this.vars.stopInfoTwo.routeTitle = data;});

			//name of stop intersections/title
			st = retrieveStopTitle(jsonList.then(data => {return data[1]}), this.vars.stopInfoTwo.stopTitle);
			st.then(data => {this.vars.stopInfoTwo.stopTitle = data;});

			//array of predictions
			m = retrieveMinutes(jsonList.then(data => {return data[1]}), this.vars.stopInfoTwo.minutes, this.config.maxDisplay);
			m.then(data => {this.vars.stopInfoTwo.minutes = data; }).catch(error => Log.log("Nothing to retrieve"));
			//end of info 2 segment---------------------------------
		}, 10000);
	},
	getStyles: function() {
		return ['scripts.css', 'font-awesome.css'];

	},
	
  // Override dom generator.
	getDom: function () {
		const wrapper = document.createElement("div");
		if(this.config.header == "") {
			wrapper.innerHTML = "Initiating Bus Schedule typically takes up to 10 seconds";
			wrapper.id = "loading";
			return wrapper;
		}

		//start of info one segment box-------------------------------------------
		const innerHeaderBox1 = document.createElement("div");
		//body of the box which holds all information about arrival times
		const innerBody1 = document.createElement("div");
		innerHeaderBox1.innerHTML = this.vars.stopInfoOne.routeTitle;
		const stopName1 = document.createElement("div");
		stopName1.innerHTML = this.vars.stopInfoOne.stopTitle + "\nArrivals:\n";
		
		//hold arrival times
		const arrivals1 = document.createElement("div");
		try{
			this.vars.stopInfoOne.minutes.forEach(arrival => {
				const time = document.createElement("div");
				var image = document.createElement("img");
				image.src = this.vars.url;
				image.className = "bus";
				time.innerHTML = arrival + " Minutes";
				time.appendChild(image);
				time.className = "arrivals";
				arrivals1.appendChild(time);
			});
		}catch(e){
			Log.log(e);
			arrivals1.id = "";
			arrivals1.innerHTML = "No arrival times available.";
		};

		arrivals1.className = "segmented-boxes";
		innerBody1.appendChild(innerHeaderBox1);
		innerBody1.appendChild(stopName1);
		innerBody1.appendChild(arrivals1);
		//end of info one segment box-------------------------------------------

		//start of segment 2----------------------------------------------------
		const innerHeaderBox2 = document.createElement("div");
		//body of the box which holds all information about arrival times
		const innerBody2 = document.createElement("div");
		innerHeaderBox2.innerHTML = this.vars.stopInfoTwo.routeTitle;
		const stopName2 = document.createElement("div");
		stopName2.innerHTML = this.vars.stopInfoTwo.stopTitle + "\nArrivals:\n";
		//hold arrival times
		const arrivals2 = document.createElement("div");
		try{
			this.vars.stopInfoTwo.minutes.forEach(arrival => {
				const time = document.createElement("div");
				var image = document.createElement("img");
				image.src = this.vars.url;
				image.className = "bus";
				time.innerHTML = arrival + " Minutes";
				time.appendChild(image);
				time.className = "arrivals";
				arrivals2.appendChild(time);
			});
		}catch(e){
			Log.log(e);
			arrivals2.id = "";
			arrivals2.innerHTML = "No arrival times available.";
		};
		arrivals2.className = "segmented-boxes";
		innerBody2.appendChild(innerHeaderBox2);
		innerBody2.appendChild(stopName2);
		innerBody2.appendChild(arrivals2);
		
		//end of segment 2 ------------------------------------------------------

		wrapper.appendChild(innerBody1);
		wrapper.appendChild(innerBody2);
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
		let closestStop = [Number.MAX_VALUE, Number.MAX_VALUE];
		let stopNumber = [0, 0];
		let primeStop = -1;
		//closest stop
		stops.forEach(stop => {
			let d = haversineCoordinateDistance(oLat, stop["lat"], oLon, stop["lon"]);
			if(d < closestStop[0]){
				closestStop[0] = d;
				if(stop["tag"] !== undefined){
					stopNumber[0] = stop["tag"];
					primeStop = stop;
				}
			}
		});
		//finding the closest opposite stop
		stops.forEach(stop => {
			let d = haversineCoordinateDistance(primeStop["lat"], stop["lat"], primeStop["lon"], stop["lon"]);
			if(d < closestStop[1]){
				closestStop[1] = d;
				if(stop["tag"] !== undefined && stop["tag"] !== stopNumber[0]){
					stopNumber[1] = stop["tag"];
				}
			}
		});
		return stopNumber;

	}).catch(error => Log.log(agency + " Promise couldn't be made"));
	//call predictions API
	const promise2 = new Promise((resolve,reject) => {

		resolve(fetch(predictions+"a="+agency+"&stops="+route+"|"+stopID[0]+"&stops="+route+"|"+stopID[1]).then(
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
		return header;
	}
}
//retrieve inner title - UPDATED JUN/25/25
async function retrieveRouteTitle(list, routeTitle){
	let newTitle = "";
	newTitle = await Promise.all([list]).then(res => {return res[0]["direction"]["title"];}).catch(error => Log.log("couldn't retrieve"));
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






