/**
	Open Innovations tool for showing bus journey times
	Version 0.2
 */
(function(root){

	var OI = root.OI || {};
	if(!OI.ready){
		OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	// The main BusTimes object
	function BusTimes(opts){
		if(!opts) opts = {};
		if(typeof opts.padding!=="number") opts.padding = 16;

		var _obj = this;

		this.selected = {'start':null,'end':null};
		this.busstops = new BusStops(this);
		this._mapdone = false;
		var seriesColours = ["#D55E00","#0072B2","#009E73","#F0E442","#CC79A7","#56B4E9","#E69F00"];

		this.loaded = function(json,cb){

			// If no Leaflet we try to load that now
			if(typeof L==="undefined"){
				if(!opts.leaflet) opts.leaflet = {};
				if(!opts.leaflet.script) opts.leaflet.script = 'leaflet.js';
				if(!opts.leaflet.style) opts.leaflet.style = 'leaflet.css';
				var lstyle = document.createElement('link');
				lstyle.setAttribute('href',opts.leaflet.style);
				lstyle.setAttribute('rel','StyleSheet');
				document.head.prepend(lstyle);
				var lscript = document.createElement('script');
				lscript.setAttribute('src',opts.leaflet.script);
				lscript.onload = function(){ loadedLeaflet(); _obj.loaded(json,cb); };
				document.head.prepend(lscript);
				return this;
			}

			// Set some styles
			document.getElementById('output').style.display = 'block';
			document.getElementById('result').style.display = 'none';

			// If we haven't made the map we do that now
			if(!this._mapdone){
				// Set the icon for the bus stops, add them to the map and set the layer control
				this.busstops.setIcon('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" fill="currentColor" overflow="visible" viewBox="0 0 16 16"><circle class="border" cx="8" cy="8" r="8" /><circle class="stop" cx="8" cy="8" r="8" /><path d="M9 4.5l0 4l4 -1l-5 6l-5 -6l4 1l0 -4z" fill="white"/></svg>');
				// Create a map
				this.map = new L.map(opts.map,{});
				this.busstops.setMap(this.map);
				// Add a tile layer to the map
				var base = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
					attribution: 'Tiles: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
					subdomains: 'abcd',
					maxZoom: 20
				});
				base.addTo(this.map);
				// Create alternate tile layers
				this.baselayers = {
					'<img src="data:image/png;base64,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" /><span>Satellite</span>': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
						attribution: 'Tiles: &copy; Esri / Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, &amp; the GIS User Community'
					}),
					'<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoBAMAAAB+0KVeAAAAHlBMVEXx8vD09fP39/X6+vjt7uz+/v7q6unu8+/m5ubn7+igff5wAAACUUlEQVQozxWRMY/UQAyF30wmC6U9yUI7cQKizGQu1JNsWKBLyM2Kck/AQYuESAsSgr9N9lluvmfZso2aNsvWGRLCz57nYMWibrVl0UQEMinOWR0C6sDaOqG4ESMNnkUJdHDMtqLxKzhLyKMACKEjkk6MEZWHlLRAoQhBs22f/HwpTf9Q5a6o9A5dIcATGNGLy+q56IDFK9U5hWlCXzWKZg53mMVJ0GUR+rTo0rlVYUD15zEWXd72yWlrXH1UiFhT+nC4htyffjs2bHNXNlh1nVK/zmqMIo1GvbsoHv/+zVIaeLzqap/eLqRRPOVwyNOk9EDEg5TpvkX+6Cuk/IJBscp+BX/sKvQDYjabdDXM+iRmOiIgKWNeyOHFoWGpzBQlTcBpfv9p8fhyIejmJahZUcCvU1Ieeh237QeAdrEHSN7fqc42i9q2MWJfvnJw4zIWJOX6sG0RgJ9bAco7MLen9G/72XgmdY9dUgJsXqXzebCt7rI7VFDd3smczj09yx5c1p1aAli9uSq8dvlHcwFrn+8MHqeoTw/uy5xfGZAcKEAazeGCJ0P6CFDl84EyTLq6f7yIc+nDu9hV7jhCgOkzrDdn/6lP5TW0QXEAQBSnScU49enDZBZ8r2CZGc9VidGY/QM0YxsggAVtgIGYz31a373dblD5uCNGUPjWp1T+AbFSHhmUhQdOy+dj8rjJhpqsw373xPxu6EHYRdrWbn/Fi6UAxEABe2rc3PM6l5EKgr3BW+yuSffbj1jX0LjVESAAshlqrHdASqxyUBqA66KuOvkPvwhv2tgJl1sAAAAASUVORK5CYII="><span>Map</span>': base,
					'<img src="data:image/png;base64,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" /><span>Transport</span>':L.tileLayer('https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png', {
						maxZoom: 18,
						attribution: 'Tiles: <a href="https://memomaps.de/">memomaps.de</a> (<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>) &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					})
				};
				this.layerControl = L.control.layers(this.baselayers, {}).addTo(this.map);
				this.layerControl.addBaseFieldset('Background').classList.add('control-tiles');
				this.layerControl.addOverlayFieldset('Markers').classList.add('control-markers');
				this.busstops.setLayerControl(this.layerControl);

				// Set a flag so we can skip this next time
				this._mapdone = true;
			}

			this.json = json;
			let id,l,geojson,line,maxLat,maxLon,minLat,minLon;

			// Build GeoJSON of route
			geojson = {'type':'FeatureCollection','features':[]};
			for(l in json.line){
				line = json.line[l];
				geojson.features.push({'type':'Feature','properties':{'id':l},'geometry':{'type':'LineString','coordinates':line}});
			}

			var service = (json.meta && json.meta.agency_name ? json.meta.name+(json.meta.name.match(json.meta.agency_name) < 0 ? " ("+json.meta.agency_name+")" : "") : "Unknown service");
			document.querySelector('#bus h2').innerHTML = service||"No service selected";

			if(this.route) this.map.removeLayer(this.route);
			
			if(geojson.features.length != 0){
				// If we have a GeoJSON route we add that to the map
				this.route = L.geoJSON(geojson,{'style':function(){ return {'color':'black','opacity':0.5,'lineJoin':'round'}; }});
				this.route.addTo(this.map);
				// Fit the map bounds to the route
				this.map.fitBounds(this.route.getBounds(),{'padding':[opts.padding,opts.padding]});
			}else{
				// Deal with the case where there is no 'line' defined in the data
				// Create empty arrays for coords
				const lats = [];
				const lons = [];
				for(id in json.stops){
					lats.push(parseFloat(json.stops[id].lat));
					lons.push(parseFloat(json.stops[id].lon));
				}
				// Find min and max values of lat and lon
				maxLat = Math.max(...lats);
				minLat = Math.min(...lats);
				maxLon = Math.max(...lons);
				minLon = Math.min(...lons);

				// Set the map bounds
				this.map.fitBounds([[minLat,minLon],[maxLat,maxLon]],{'padding':[opts.padding,opts.padding]});
			}

			// Add stops
			this.busstops.clear().setData(json);

			if(typeof cb==="function") cb.call(this);

			return this;
		};

		this.loadBus = function(itl,id,cb){
			this.service = id;
			this.itl = itl;
			var url = 'data/'+itl+'/'+id+'.json';
			this.selected = {'start':null,'end':null};
			document.querySelector('.loader').style.display = '';
			if(document.getElementById('bad')) document.getElementById('bad').remove();
			fetch(url,{}).then(response => {
				if(!response.ok) throw new Error('Network response was not OK');
				return response.json();
			}).then(json => {
				document.querySelector('.loader').style.display = 'none';
				this.loaded(json,cb);
			}).catch(e => {
				console.error('There has been a problem loading bus data %c'+id+'%c. It may not be publicly accessible or have some other issue.','font-style:italic;','font-style:normal;');
				document.querySelector('.loader').style.display = 'none';
				// Add error message
				var err = document.getElementById('bad');
				if(!err){
					err = document.createElement('div');
					err.id = "bad";
					err.classList.add('error','padded');
					document.querySelector('.loader').after(err);
				}
				err.innerHTML = "No bus data seems to exist for <em>"+id+'</em>.';
			});
		};
		this.updateChart = function(filter){
			var data = {'real':[],'timetable':[]};

			if(this.selected.start && this.selected.end){
				let s = this.selected.start.id;
				let e = this.selected.end.id;
				let trips = this.json.trips;
				let valid = [],v;
				// Process trips to find strings of bus stops
				for(let t = 0; t < trips.length; t++){
					let match = {'s':-1,'e':-1};
					let n = 0;
					for(let i = 0; i < trips[t].length; i++){
						// Reshape
						if(trips[t][i].length) trips[t][i] = {'stop_id':trips[t][i][0],'real':trips[t][i][1],'timetable':trips[t][i][2],'interpolated':trips[t][i][3] ? true:false};
						// Find matches
						if(match.s < 0 && trips[t][i].stop_id==s){ match.s = i; n++; }
						if(match.e < 0 && trips[t][i].stop_id==e){ match.e = i; n++; }
					}
					// Filter trips by allowed days
					let dt = new Date(trips[t][0].timetable*1000);
					let ok = true;
					if(filter == "week"){
						if(dt.getDay()==0 || dt.getDay()==6) ok = false;
					}else if(filter == "weekend"){
						if(dt.getDay()>0 && dt.getDay()<6) ok = false;
					}

					if(ok && n==2){
						v = {};
						v = {'s':trips[t][match.s],'e':trips[t][match.e]};
						let dt2 = new Date(trips[t][match.s].timetable*1000);
						v.s.hour = niceTime(dt2);//dt2.getHours() + (dt2.getMinutes()/60);
						valid.push(v);
					}
				}
				valid = valid.sort(function(a,b){ return (a.s.hour > b.s.hour ? 1 : -1); });

				// Get the distance between the two stops in km
				let dist = this.busstops.distanceBetween(s,e)/1000;

				// For each valid trip
				for(let t = 0; t < valid.length; t++){
					let dt = new Date(valid[t].s.timetable*1000);
					let dr = new Date(valid[t].s.real*1000);
					let a = getMinutes(valid[t].e.real - valid[t].s.real);
					let speed = dist/(a/60);
					// Only keep points between 1-100 kph
					if(speed <= 100 && speed >= 1){
						let b = getMinutes(valid[t].e.timetable - valid[t].s.timetable);
						let late = getMinutes(valid[t].e.timetable - valid[t].e.real);
						//let c = getMinutes(valid[t].e.real - valid[t].s.timetable);
						//let h = dt.getHours()+dt.getMinutes()/60;
						let label = '<h3>'+dt.toLocaleDateString('en-GB',{weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})+'</h3>';
						label += '<table><tr><th></th><th title="'+valid[t].s.stop_id+'">Start</th><th title="'+valid[t].e.stop_id+'">End</th><th>Duration</th></tr>';
						label += '<tr class="timetable"><td>Timetable</td><td>'+niceTime(dt)+'</td><td>'+niceTime(new Date(valid[t].e.timetable*1000))+'</td><td><strong>'+b+'</strong> mins</td></tr>';
						label += '<tr class="real"><td>Real</td><td'+(valid[t].s.interpolated ? ' class="interpolated"':'')+'>'+niceTime(new Date(valid[t].s.real*1000))+(valid[t].s.interpolated ? '<sup class="footnote">*</sup>':'')+'</td><td'+(valid[t].e.interpolated ? ' class="interpolated"':'')+'>'+niceTime(new Date(valid[t].e.real*1000))+(valid[t].e.interpolated ? '<sup class="footnote">*</sup>':'')+'</td><td><strong>'+a+'</strong> mins</td></tr></table>';
						label += '<p>'+earlyLate(b-a,"quicker","slower")+' journey arriving ' +earlyLate(late)+'</p>';
						if(valid[t].s.interpolated || valid[t].e.interpolated){
							label += '<p>* time estimated using real times from stops before/after</p>';
						}
						data.real.push({x:(dr.getHours()+dr.getMinutes()/60),y:a,label:label,t:t,'class':(valid[t].s.interpolated || valid[t].e.interpolated ? 'interpolated':'')});
						data.timetable.push({x:(dt.getHours()+dt.getMinutes()/60),y:b,label:label,t:t});
					}else{
						console.warn('Ignoring unrealistic speed ('+speed.toFixed(1)+' km/h) between',valid[t].s,valid[t].e);
					}
				}
			}
			document.getElementById('chart').innerHTML = '';
			this.chart = new SimpleChart(document.getElementById('chart'),{'seriesColours':seriesColours,});
			this.chart.addSeries(data.real,{r:3,boxplot:1});
			this.chart.addSeries(data.timetable,{r:3,line:{'stroke-width':'2','stroke':seriesColours[1]},boxplot:2});
			this.chart.updateSizes();

			return this;
		};
		this.finishRoute = function(){
			var html = '';
			if(!this.selected.start || !this.selected.end){
				document.getElementById('result-inner').innerHTML = '';
				document.getElementById('result').style.display = 'none';
				return this;
			}

			html += '<div class="stops">';
			html += '<div class="start strip">'+this.selected.start.data.name+' [<a href="https://bustimes.org/stops/'+this.selected.start.id+'" target="bustimes" class="stopid">'+this.selected.start.id+'</a>]</div>';
			html += '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" overflow="visible" viewBox="0 0 16 16" style="vertical-align:-.125em"><path d="M9 4.5l0 4l4 -1l-5 6l-5 -6l4 1l0 -4z" transform="rotate(-90,8,8)" /><title>to</title></svg>';
			html += '<div class="end strip">'+this.selected.end.data.name+' [<a href="https://bustimes.org/stops/'+this.selected.end.id+'" target="bustimes" class="stopid">'+this.selected.end.id+'</a>]</div>';
			html += '</div>';
			html += '';
			html += '<div class="legend"><div><span class="icon" style="background:'+seriesColours[0]+';"></span>Real journey time</div><div><span class="icon" style="background:'+seriesColours[1]+';"></span>Timetabled journey time</div></div>';
			html += '<div id="chart" class="oi-viz oi-chart oi-chart-scatter"></div>';

			// Update page
			document.getElementById('result-inner').innerHTML = html;
			document.getElementById('result').style.display = (this.selected.start && this.selected.end) ? '':'none';

			html = '';
			if(this.selected.start && this.selected.end){
				html += '<a href="?'+(this.itl ? 'itl='+this.itl : '')+'&service='+this.service+(this.selected.start ? '&start='+this.selected.start.id : '')+(this.selected.end ? '&end='+this.selected.end.id : '')+'">Link to this journey</a>';
				if(this.json.meta.bustimesorg) html += ' | <a href="https://bustimes.org/services/'+this.json.meta.id+'">View timetable on bustimes.org</a>';
			}
			document.getElementById('result-links').innerHTML = html;

			addEv('change',document.getElementById('time-filter'),{me:this},function(e){
				e.data.me.updateChart(e.target.value);
			});

			this.updateChart(document.getElementById('time-filter').value);

			return this;
		};

		function earlyLate(d,early,late){
			var v = (Math.abs(d) < 1) ? '<1' : Math.round(Math.abs(d))+'';
			return '<strong>'+(d >= 0 ? v+'</strong> min'+(Math.abs(d)<1 ? '':'s')+' '+(early||"early"):v+'</strong> min'+(Math.abs(d)<1==1?'':'s')+' '+(late||"late"));
		}

		return this;
	}
	
	function BusStops(_obj){
		var map;
		this.parent = _obj;
		var stops = {};
		this.setMap = function(m){
			map = m;
			return this;
		};
		this.setData = function(data){
			// Add stops
			for(var id in data.stops) stops[id] = new BusStop(id,data,this);
			if(map) this.group.addTo(map);
			return this;
		};
		this.setIcon = function(svg){
			var v,d,versions,icons;
			this.icons = {};
			icons = {
				'none':svg.replace(/<path[^\>]*>/,''),
				'north':svg.replace('path ','path transform="rotate(180,8,8)"'),
				'north-east':svg.replace('path ','path transform="rotate(-135,8,8)"'),
				'east':svg.replace('path ','path transform="rotate(-90,8,8)"'),
				'south-east':svg.replace('path ','path transform="rotate(-45,8,8)"'),
				'south':svg,
				'south-west':svg.replace('path ','path transform="rotate(45,8,8)"'),
				'west':svg.replace('path ','path transform="rotate(90,8,8)"'),
				'north-west':svg.replace('path ','path transform="rotate(135,8,8)"')
			};
			// Create a stop icon of each direction
			for(d in icons) this.icons[d] = L.divIcon({'className': 'bus-stop','html':icons[d]});
			versions = {'selected':'selected','start':'selected start','end':'selected end'};
			// Create a stop icon of each direction and selection type
			for(v in versions){
				for(d in icons) this.icons[d+'-'+v] = L.divIcon({'className': 'bus-stop'+(versions[v] ? ' '+versions[v] : ''),'html':icons[d]});
			}
			return this;
		};
		this.setLayerControl = function(layerControl){
			if(map){
				// Create a group
				this.group = L.layerGroup();
				// Add the (empty) group to the map
				this.group.addTo(map);
				// Add it to the layer control
				layerControl.addOverlay(this.group, "Bus stops");
			}else{
				console.warning('No map to add layer control to');
			}
			return this;
		};
		this.getStops = function(){
			return stops;
		};
		this.getStopByID = function(id){
			if(id in stops) return stops[id];
			return undefined;
		};
		this.distanceBetween = function(a,b){
			var d = -1;
			if(a in stops && b in stops) d = greatCircle([stops[a].data.lon,stops[a].data.lat],[stops[b].data.lon,stops[b].data.lat]);
			else console.warning('Unknown stops '+a+' & '+b);
			return d;
		};
		this.clear = function(){
			// Remove the layer
			if(this.group) this.group.clearLayers();
			stops = {};
			return this;
		};
		return this;
	}

	function BusStop(id, data, group){
		var _parent = group.parent;
		var _obj = this;
		var datum = data.stops[id];
		var dir = compassDirection(datum.bearing);
		datum.dir = dir;
		this.id = id;
		this.data = datum;
		var inner = "<p><strong>" + datum.name + '</strong><br/>'+(dir!=="none" ? 'Buses point ' + dir + '<br/>':'')+'<a href="https://bustimes.org/stops/'+id+'" target="bustimes">more info</a></p>';
		var t,i,found;
		this.start = false;
		this.end = false;
		
		// Use the trips to find previous stop, next stop, stops before and stops after
		this.previous = {};
		this.next = {};
		this.after = {};
		this.before = {};
		for(t = 0; t < data.trips.length; t++){
			found = -1;
			for(i = 0; i < data.trips[t].length; i++){
				if(data.trips[t][i][0]==id){
					found = i;
				}
			}
			if(found >= 0){
				if(found > 0) this.previous[data.trips[t][found-1][0]] = true;
				if(found < data.trips[t].length-1) this.next[data.trips[t][found+1][0]] = true;
				for(i = 0; i < data.trips[t].length; i++){
					if(i > found) this.after[data.trips[t][i][0]] = true;
					else if(i < found) this.before[data.trips[t][i][0]] = true;
				}
			}
		}

		// Create the marker
		this.marker = L.marker([datum.lat, datum.lon], {icon: group.icons[dir],'id':id,'data':datum});
		
		group.group.addLayer(this.marker);

		// Create the popup
		var popupEl = document.createElement('div');
		popupEl.innerHTML = inner;

		// Bind the popup to the marker
		this.marker.bindPopup(popupEl,{'offset':[0,-10],'maxWidth': 500});
		this.marker.on('click', function(e){ _obj.toggleOpen(); });
		
		this.setIcon = function(name){
			this.marker.setIcon(group.icons[name]);
			return this;
		};
		this.toggleStart = function(){
			if(_parent.selected.start==this){
				this.deselect();
				_parent.selected.start = null;
			}else{
				// Remove any existing selections
				if(_parent.selected.start) _parent.selected.start.deselect();
				_parent.selected.start = this;
				this.setIcon(this.data.dir+'-start');
				this.start = true;
			}
			this.updateActive();

			_parent.map.closePopup();
			return _parent.finishRoute();
		};
		this.toggleEnd = function(){
			if(_parent.selected.end==this){
				this.deselect();
				_parent.selected.end = null;
			}else{
				// Remove any existing selections
				if(_parent.selected.end) _parent.selected.end.deselect();
				_parent.selected.end = this;
				this.setIcon(this.data.dir+'-end');
				this.end = true;
			}
			this.updateActive();
			_parent.map.closePopup();
			return _parent.finishRoute();
		};
		this.updateActive = function(){
			var id,checks,ok,stops;
			stops = group.getStops();
			checks = 0;
			if(_parent.selected.start) checks++;
			if(_parent.selected.end) checks++;
			for(id in stops){
				ok = 0;
				// If we have a start set and the ID is the start or after
				if(_parent.selected.start && (id==_parent.selected.start.id || id in _parent.selected.start.after)) ok++;
				// If we have a end set and the ID is the end or before
				if(_parent.selected.end && (id==_parent.selected.end.id || id in _parent.selected.end.before)) ok++;
				if(ok==checks) stops[id].enable();
				else stops[id].disable();
			}
			return this;
		};
		this.deselect = function(){
			this.setIcon(this.data.dir);
			this.start = false;
			this.end = false;
			return this;
		};
		this.disable = function(){
			this.marker._icon.setAttribute('disabled','disabled');
			return this;
		};
		this.enable = function(){
			this.marker._icon.removeAttribute('disabled');
			return this;
		};
		this.toggleOpen = function(){
			// Update popup content
			popupEl.innerHTML = inner;
			if(_parent){
				var div = document.createElement('div');
				div.classList.add('buttons');
				var btn = [document.createElement("button"),document.createElement("button")];
				btn[0].classList.add('start');
				btn[0].innerHTML = (this.start ? "Unset start":"Set as start");
				btn[0].onclick = function(){ _obj.toggleStart(); };
				btn[1].classList.add('end');
				btn[1].innerHTML = (this.end ? "Unset end":"Set as end");
				btn[1].onclick = function(){ _obj.toggleEnd(); };
				div.appendChild(btn[0]);
				div.appendChild(btn[1]);
				popupEl.appendChild(div);
			}
      var li,id;
			var nav = document.createElement('div');
			nav.classList.add('stop-nav');
			var ulprev = document.createElement('ul');
			if(this.previous){
				ulprev.classList.add("prev");
				for(id in this.previous){
					li = document.createElement("li");
					li.setAttribute('data-id',id);
					li.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-short" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5" aria-hidden="true" /></svg><span title="'+id+'">'+group.getStopByID(id).data.name+'</span>';
					addEv('click',li,{id:id,parent:_parent},function(e){
						trigger(e.data.parent.busstops.getStopByID(e.data.id).marker._icon,'click');
					});
					ulprev.appendChild(li);
				}
			}
			var ulnext = document.createElement('ul');
			if(this.next){
				ulnext.classList.add("next");
				for(id in this.next){
					li = document.createElement("li");
					li.setAttribute('data-id',id);
					li.innerHTML = '<span title="'+id+'">'+group.getStopByID(id).data.name+'</span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-right-short" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8" aria-hidden="true" /></svg>';
					addEv('click',li,{id:id,parent:_parent},function(e){
						trigger(e.data.parent.busstops.getStopByID(e.data.id).marker._icon,'click');
					});
					ulnext.appendChild(li);
				}
			}
			nav.appendChild(ulprev);
			nav.appendChild(ulnext);
			popupEl.appendChild(nav);

			this.marker._popup.setContent(popupEl);

			document.querySelectorAll('.bus-stop.open').forEach((el)=>{
				if(el!=_obj.marker._icon) el.classList.remove('open');
			});
			this.marker._icon.classList.toggle('open');
			return this;
		};

		return this;
	}

	function niceTime(d){
		return (d.getHours()<10 ? "0":"")+d.getHours()+":"+(d.getMinutes()<10 ? "0":"")+d.getMinutes();
	}
	function getMinutes(s){
		return parseFloat((s/60).toFixed(1));
	}
	function compassDirection(a){
		var d,b,i;
		if(a==null) return "none";
		d = ["north","north-east","east","south-east","south","south-west","west","north-west"];
		b = 360/d.length;
		i = Math.round((a-b/2)/b);
		return d[i];
	}
	function loadedLeaflet(){
		// Add methods to layer control class
		L.Control.Layers.include({
			getCheckedByLabel: function(name){
				for(var i = 0; i < this._layers.length; i++){
					if(this._layers[i].name==name) return this._layerControlInputs[i].checked;
				}
				return false;
			},
			convertToRadio: function(){
				// Very simplistic method to convert overlay checkboxes to radio buttons
				// Will run into errors if there are multiple controls
				for(var i = 0; i < this._layers.length; i++){
					if(this._layers[i].overlay){
						this._layerControlInputs[i].setAttribute("type", "radio");
						this._layerControlInputs[i].setAttribute("name", "overlays");
					}
				}
				return this;
			},
			_addTo: function(el,p,h){ el.insertAdjacentHTML(p,h); return el; },
			_wrapFieldset: function(el,t){
				const f = document.createElement('fieldset');
				el.replaceWith(f);
				f.appendChild(el);
				const l = document.createElement('legend');
				l.innerHTML = t;
				f.prepend(l);
				return f;
			},
			addBaseFieldset: function(txt){ return this._wrapFieldset(this.getBase(),txt); },
			addOverlayFieldset: function(txt){ return this._wrapFieldset(this.getOverlays(),txt); },
			prependBase: function(h){ return this._addTo(this.getBase(),"afterbegin",h); },
			prependOverlay: function(h){ return this._addTo(this.getOverlays(),"afterbegin",h); },
			appendBase: function(h){ return this._addTo(this.getBase(),"beforeend",h); },
			appendOverlay: function(h){ return this._addTo(this.getOverlays(),"beforeend",h); },
			getBase: function(){ return this._baseLayersList; },
			getOverlays: function(){ return this._overlaysList; }
		});
	}

	OI.bustimes = BusTimes;

	function SimpleChart(el,opts){
		if(!el){
			console.error('no element');
			return this;
		}
		var w = 1080,h,aspect = w/h;
		var fs = parseFloat(window.getComputedStyle(el, null).getPropertyValue('font-size'));
		var boxplotspace = 20;
		var boxplotwide = 30;
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" class="oi-chart-main" overflow="visible" style="max-width:100%;width:100%;" preserveAspectRatio="xMidYMin meet" data-type="scatter-chart" vector-effect="non-scaling-stroke"><g class="axis-grid axis-grid-x"></g><g class="axis-grid axis-grid-y"></g><g class="data-layer" role="table"></g></svg>';
		el.innerHTML = svg;
		// Update width, height and aspect ratio
		w = el.getBoundingClientRect().width;
		h = (w*0.6);
		aspect = w/h;
		el.querySelector('.oi-chart-main').setAttribute('viewBox','0 0 '+w+' '+h);
		
		var seriesColours = opts.seriesColours||["#000000","#000000"];
		this.svg = el.querySelector('.oi-chart-main');
		this.axis = {'x':{'title':{'label':'Time of day'},'pad':4,'el':el.querySelector('.axis-grid-x')},'y':{'title':{'label':'Journey time (mins)'},'pad':4,'el':el.querySelector('.axis-grid-y')}};
		this.data = {'el':el.querySelector('.data-layer'),'series':[]};

		this.getSeriesColour = function(i){
			return seriesColours[i];
		};
		this.addAxisLine = function(dir,v,d){
			var g = svgEl("g");
			setAttr(g,{data:d});
			var l = svgEl("line");
			setAttr(l,{'stroke':'#bbb','stroke-width':1});
			var t = svgEl('text');
			setAttr(t,{'text-anchor':(dir=="x" ? 'middle':'end'),'stroke-width':0,'fill':'#000000','dominant-baseline':'central'});
			t.innerHTML = '<tspan font-size="'+fs+'" dx="'+(dir=="y" ? -4:0)+'" dy="'+(dir=="x" ? 4:0)+'" x="0" y="'+(dir=="x" ? fs/2 : 0)+'">'+d+'</tspan>';
			g.append(l);
			g.append(t);
			this.axis[dir].labels.push({'g':g,'line':l,'txt':t,'value':v,'label':d});
			this.axis[dir].el.append(g);
			return this;
		};
		this.updateSizes = function(){
			this.svg.style.display = 'none';
			w = el.offsetWidth;
			h = w/aspect;
			this.svg.setAttribute('viewBox','0 0 '+w+' '+h);
			this.svg.style.display = '';

			// Need to build axis labels
			this.axis.x.min = 0;
			this.axis.x.max = 24;
			this.axis.y.min = 0;
			this.axis.y.max = 50;

			var max = 0,i,s,d;
			var nice = {'spacing':10};
			for(s = 0; s < this.data.series.length; s++){
				if(this.data.series[s].marks && this.data.series[s].marks.length > 0){
					for(i = 0; i < this.data.series[s].marks.length; i++){
						max = Math.max(max,this.data.series[s].marks[i].v.y);
					}
				}
			}
			if(max > 0){
				nice = niceRange(this.axis.y.min,max,4);
				this.axis.y.max = nice.max;
			}

			// x-axis
			this.axis.x.labels = [];
			for(i = this.axis.x.min; i <= this.axis.x.max; i+=2){
				d = (i<10?"0":"")+i+":00";
				this.addAxisLine('x',i,(i==24 || i==0 ? "":d));
			}
			// y-axis
			this.axis.y.labels = [];
			for(i = this.axis.y.min; i <= this.axis.y.max; i+=nice.spacing) this.addAxisLine('y',i,i);

			var nbox = 0;
			for(s = 0; s < this.data.series.length; s++){
				if("opts" in this.data.series[s] && typeof this.data.series[s].opts.boxplot==="number") nbox = Math.max(nbox,this.data.series[s].opts.boxplot);
			}
			// Padding on the right
			this.axis.x.right = nbox*(boxplotwide+boxplotspace);
			this.axis.y.top = 0;
			this.axis.x.left = this.axis.y.pad + (this.axis.y.title.label ? fs*1.5:0) + fs*1.5 + 4;
			this.axis.x.wide = w - this.axis.x.left - this.axis.x.right - this.axis.y.pad;
			this.axis.y.bottom = h - this.axis.x.pad - (this.axis.x.title.label ? fs*1.5:0) - fs*1.5 - 4;
			this.axis.y.tall = this.axis.y.bottom - this.axis.x.pad - this.axis.y.top; 

			this.updateAxis("x");
			this.updateAxis("y");
			
			for(s = 0; s < this.data.series.length; s++){
				this.updateSeries(s+1);
			}

			if(OI.InteractiveChart){
				var _obj = this;
				OI.InteractiveChart(el,{'show':function(pt,e){
					var i = parseInt(pt.getAttribute('data-i'));
					// Remove existing active classes
					_obj.svg.querySelectorAll('.marker.active').forEach(function(el,i){ el.classList.remove('active'); });
					var series = _obj.data.series;
					// Add classes to the appropriate point in each series
					for(var s = 0; s < series.length; s++){
						_obj.data.series[s].marks[i].mark.classList.add('active');
					}
				}});
			}
			return this;
		};
		this.addAxis = function(t){
			// Add title
			this.axis[t].title.el = this.axis[t].el.querySelector('.axis-grid-title');
			if(!this.axis[t].title.el && this.axis[t].title.label){
				this.axis[t].title.el = svgEl("text");
				this.axis[t].el.append(this.axis[t].title.el);
				setAttr(this.axis[t].title.el,{'font-family':'Poppins,Arial','font-size':fs+'px','text-anchor':'middle'});
				this.axis[t].title.el.classList.add('axis-grid-title');
				this.axis[t].title.el.innerHTML = this.axis[t].title.label;
			}
			return this;
		};
		this.getXY = function(x,y){
			return {
				x:this.axis.x.left + this.axis.x.wide*(x-this.axis.x.min)/(this.axis.x.max-this.axis.x.min),
				y:this.axis.y.bottom - this.axis.y.tall*(y-this.axis.y.min)/(this.axis.y.max-this.axis.y.min)
			};
		};
		this.updateAxis = function(t){
      var x,y,a;
			if(t=="x"){
				x = this.axis.x.left + (this.axis.x.wide/2);
				y = (h - this.axis.x.pad - fs/2);
				a = {x:x,y:y};
			}else if(t=="y"){
				x = this.axis.y.pad + (fs/2);
				y = (this.axis.y.bottom - this.axis.y.tall/2);
				a = {x:x,y:y,transform:'rotate(-90,'+x+','+y+')','dy':this.axis.y.pad};
			}
			setAttr(this.axis[t].title.el,a);

			var dx,i,tw,p = 0,prev = 0,newfs = fs;
			// Remove existing line groups
			this.axis[t].el.querySelectorAll('g').forEach((el)=>{el.remove();});
			for(i = 0; i < this.axis[t].labels.length; i++){
				// Add group to axis
				this.axis[t].el.append(this.axis[t].labels[i].g);
				x = (t=="x") ? this.axis.x.labels[i].value : this.axis.x.min;
				y = (t=="x") ? this.axis.y.min : this.axis.y.labels[i].value;
				p = this.getXY(x,y);
				this.axis[t].labels[i].g.setAttribute('transform','translate('+(p.x).toFixed(3)+','+(p.y).toFixed(3)+')');
				if(t=="x"){
					setAttr(this.axis.x.labels[i].line,{'x1':0,'x2':0,'y1':0,'y2':-this.axis.y.tall});
					tw = this.axis.x.labels[i].txt.getBoundingClientRect().width;
					dx = (p.x-prev.x);
					if(tw > dx*0.9){
						newfs = Math.min(newfs,fs*(dx*0.9)/tw);
					}
				}else if(t=="y"){
					setAttr(this.axis.y.labels[i].line,{'x1':0,'x2':this.axis.x.wide,'y1':0,'y2':0});
				}
				prev = p;
			}
			if(newfs != fs){
				for(i = 0; i < this.axis[t].labels.length; i++){
					this.axis[t].labels[i].txt.querySelector('tspan').setAttribute('font-size',newfs);
				}
			}

			return this;
		};
		this.clearData = function(){
			this.data.el.querySelector('.marker').forEach((el)=>{el.remove();});
			this.data.series = [];
			return this;
		};
		this.addSeries = function(pts,opt){
			if(!opt) opt = {};
			var el,s,marks = [],path,series;
			s = (this.data.series.length+1);
			// Create a group
			el = svgEl('g');
			// Create path for the line
			path = svgEl('path');
			setAttr(path,{'fill':'transparent'});
			if(opt.line) setAttr(path,opt.line);
			el.classList.add('series','series-'+s);
			el.append(path);
			this.data.el.append(el);
			setAttr(el,{'role':'row','data-series':s});
			for(let i = 0; i < pts.length; i++){
				//var p = this.getXY(pts[i].x,pts[i].y);
				var mark = svgEl('circle');
				mark.classList.add('marker');
				setAttr(mark,{'cx':0,'cy':0,r:(opt.r||2.5),role:'cell',fill:(opt.fill||seriesColours[s-1]),'data-i':i,'data-series':s,'fill-opacity':(opt['fill-opacity']||1),'stroke-width':(opt['stroke-width']||0)});
				el.append(mark);
				if(pts[i].class) mark.classList.add(pts[i].class);
				if(pts[i].label) mark.innerHTML = '<title>'+(pts[i].label)+'</title>';
				marks.push({'mark':mark,'v':pts[i]});
			}
			series = {'el':el,'marks':marks,'path':path,'opts':opt};
			if(opt.boxplot){
				var box = svgEl('g');
				box.classList.add('boxplot');
				box.innerHTML = '<path d="M0 0"><title></title></path>';
				this.data.el.append(box);
				series.boxplot = box;
			}
			this.data.series.push(series);
			this.updateSeries(s);
			return this;
		};
		this.updateSeries = function(s){
			var d = "",i,qs,dx,x,txt;
			for(let i = 0; i < this.data.series[s-1].marks.length; i++){
				var p = this.getXY(this.data.series[s-1].marks[i].v.x,this.data.series[s-1].marks[i].v.y);
				if(!isNaN(p.x) && !isNaN(p.y)){
					setAttr(this.data.series[s-1].marks[i].mark,{transform:'translate('+p.x.toFixed(3)+','+p.y.toFixed(3)+')'});
					d += (i==0 ? 'M':'L')+p.x.toFixed(3)+','+p.y.toFixed(3);
				}
			}
			this.data.series[s-1].path.setAttribute('d',d);
			if(this.data.series[s-1].boxplot){
				if(!this.data.series[s-1].stats){
					// Calculate stats
					var vals = [];
					for(let i = 0; i < this.data.series[s-1].marks.length; i++){
						vals.push(this.data.series[s-1].marks[i].v.y);
					}
					this.data.series[s-1].stats = getBoxPlotStats(vals);
				}
				// Process quartile values into y positions
				qs = this.data.series[s-1].stats.quartiles.slice();
				for(i = 0; i < qs.length; i++) qs[i] = {p:this.getXY(0,qs[i]),v:qs[i]};
				// Create path
				dx = Math.round(boxplotwide/2);
				x = this.axis.x.left + this.axis.x.wide + ((boxplotspace+boxplotwide)*this.data.series[s-1].opts.boxplot - boxplotwide/2);
				d = "M"+(x-dx)+" "+qs[0].p.y+"l"+(dx*2)+" 0M"+x+" "+qs[0].p.y+"L"+(x)+" "+(qs[1].p.y);
				d += "M"+(x-dx)+" "+qs[1].p.y+"l0 "+(qs[2].p.y-qs[1].p.y)+'l'+(dx*2)+" 0l0 "+(qs[1].p.y-qs[2].p.y)+'l-'+(dx*2)+' 0';
				d += "M"+(x-dx)+" "+qs[2].p.y+"l0 "+(qs[3].p.y-qs[2].p.y)+'l'+(dx*2)+" 0l0 "+(qs[2].p.y-qs[3].p.y)+'l-'+(dx*2)+' 0';
				d += "M"+(x)+" "+qs[3].p.y+"l0 "+(qs[4].p.y-qs[3].p.y)+"m"+(-dx)+" 0l"+(2*dx)+" 0";
				setAttr(this.data.series[s-1].boxplot.querySelector('path'),{'d':d,'stroke':'black','fill':this.data.series[s-1].opts.fill||seriesColours[s-1]});
				txt = "<h3>Distribution</h3><table><tr>";
				txt += '<tr><td>Max</td><td><strong>'+this.data.series[s-1].stats.max.toFixed(1)+'</strong> mins</td></tr>';
				txt += '<tr><td>3rd quartile</td><td><strong>'+qs[3].v.toFixed(1)+'</strong> mins</td></tr>';
				txt += '<tr><td>Median</td><td><strong>'+this.data.series[s-1].stats.median.toFixed(1)+'</strong> mins</td></tr>';
				txt += '<tr><td>1st quartile</td><td><strong>'+qs[1].v.toFixed(1)+'</strong> mins</td></tr>';
				txt += '<tr><td>Min</td><td><strong>'+this.data.series[s-1].stats.min.toFixed(1)+'</strong> mins</td></tr>';
				txt += '</table>';

				this.data.series[s-1].boxplot.querySelector('title').innerHTML = txt;
				this.data.series[s-1].boxplot.querySelector('path').classList.add('marker');
				OI.Tooltips.add(this.data.series[s-1].boxplot.querySelector('path'));
			}
			return this;
		};

		this.addAxis("x");
		this.addAxis("y");

		var _obj = this;
		window.addEventListener('resize',function(){
			_obj.updateSizes();
		});
		
		return this;
	}
	function svgEl(t){
		return document.createElementNS("http://www.w3.org/2000/svg",t);
	}
	function setAttr(el,prop){
		for(var p in prop) el.setAttribute(p,prop[p]);
		return el;
	}
	function niceRange(mn,mx,n){

		var dv,log10_dv,base,frac,options,distance,imin,tmin,i;

		// Start off by finding the exact spacing
		dv = (mx-mn)/n;

		// In any given order of magnitude interval, we allow the spacing to be
		// 1, 2, 5, or 10 (since all divide 10 evenly). We start off by finding the
		// log of the spacing value, then splitting this into the integer and
		// fractional part (note that for negative values, we consider the base to
		// be the next value 'down' where down is more negative, so -3.6 would be
		// split into -4 and 0.4).
		log10_dv = Math.log10(dv);
		base = Math.floor(log10_dv);
		frac = log10_dv - base;

		// We now want to check whether frac falls closest to 1, 2, 5, or 10 (in log
		// space). There are more efficient ways of doing this but this is just for clarity.
		options = [1,2,5,10];
		distance = new Array(options.length);
		imin = -1;
		tmin = 1e100;
		for(i = 0; i < options.length; i++){
			distance[i] = Math.abs(frac - Math.log10(options[i]));
			if(distance[i] < tmin){
				tmin = distance[i];
				imin = i;
			}
		}
		dv = Math.pow(10,base) * options[imin];
		// Now determine the actual spacing
		return {'spacing':dv,'min':Math.floor(mn/dv)*dv,'max':Math.ceil(mx/dv)*dv};
	}
	OI.niceRange = niceRange;
	function getQuartile(arr,q){
		q /= 100;
		arr = [...arr].sort((a, b) => a - b);	// Avoid mutating original array
		// Work out the position in the array of the percentile point
		var p = ((arr.length) - 1) * q;
		var b = Math.floor(p);
		// Work out what we rounded off (if anything)
		var remainder = p - b;
		// See whether that data exists directly
		if(arr[b+1]!==undefined) return arr[b] + remainder * (arr[b+1] - arr[b]);
		else return arr[b];
	}
	function getBoxPlotStats(arr){
		arr = [...arr].sort((a, b) => a - b); // Avoid mutating original array
		return {'median':getQuartile(arr,50),'max':arr[arr.length-1],'min':arr[0],'quartiles':[arr[0],getQuartile(arr,25),getQuartile(arr,50),getQuartile(arr,75),arr[arr.length-1]]};
	}
	function greatCircle(a,b){
		// Inputs [longitude,latitude]
		var d2r = Math.PI/180;
		var R = 6.3781e6; // metres
		var f1 = a[1]*d2r;
		var f2 = b[1]*d2r;
		var dlat = (a[1]-b[1])*d2r;
		var dlon = (a[0]-b[0])*d2r;
		var d = Math.sin(dlat/2) * Math.sin(dlat/2) +
				Math.cos(f1) * Math.cos(f2) *
				Math.sin(dlon/2) * Math.sin(dlon/2);
		var c = 2 * Math.atan2(Math.sqrt(d), Math.sqrt(1-d));
		return R * c;
	}		
	function addEv(ev,el,data,fn){
		el.addEventListener(ev,function(e){
			e.data = data;
			fn.call(data.this||this,e);
		});
	}
	function trigger(el, eventType) {
		if(typeof eventType === 'string' && typeof el[eventType] === 'function'){
			el[eventType]();
		}else{
			const event = typeof eventType === 'string' ? new Event(eventType, {bubbles: true}) : eventType;
			el.dispatchEvent(event);
		}
	}

	root.OI = OI||root.OI||{};

})(window || this);