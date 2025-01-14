/*!
	Typeahead search v0.2.1
*/
(function(root){

	function Builder(){
		this.version = "0.2.1";
		this.init = function(el,opt){ return new TA(el,opt); };
		return this;
	}

	/*
	 * @desc Create a new TypeAhead object
	 * @param {DOM|string} el - the DOM element
	 * @param {object} opt - configuration options
	 */
	function TA(el,opt){
		if(!opt) opt = {};
		if(typeof el==="string") el = document.querySelector(el);
		if(!el){
			console.warn('No valid element provided');
			return this;
		}
		var _obj = this;
		var evs = {};
		var items = opt.items||[];
		var results,frm,wrapper;

		window.addEventListener('resize',function(){
			if(wrapper){
				wrapper.style.width = '';
				wrapper.style.width = el.offsetWidth;
			}
		});
		function click(ev){
			ev.preventDefault();
			ev.stopPropagation();
			selectLI(this.getAttribute('data-id'));
		}
		function search(s,e,t){
			var n,i,tmp,str,html,datum,ev;
			str = s.toUpperCase();

			// Rank the results
			tmp = [];
			if(str){
				for(i = 0 ; i < items.length; i++){
					datum = {'rank':0,'key':i,'value':items[i]};
					if(typeof opt.rank==="function") datum.rank = opt.rank(items[i],s);
					else{
						if(items[i].toUpperCase().indexOf(str) == 0) datum.rank += 3;
						if(items[i].toUpperCase().indexOf(str) > 0) datum.rank += 1;
					}
					tmp.push(datum);
				}
				tmp = sortBy(tmp,'rank');
			}

			// Add results to DOM
			if(!results){
				el.parentElement.style.position = "relative";
				results = document.createElement('div');
				results.classList.add('typeahead-results');
				wrapper.style.width = el.offsetWidth;
				frm.style.position = "relative";
				el.insertAdjacentElement('afterend',results);
			}

			html = "";
			if(tmp.length > 0){
				n = (typeof opt.max==="number") ? Math.min(tmp.length,opt.max) : tmp.length;
				html = '<ol id="'+el.id+'_listbox" aria-labelledby="'+el.id+'" role="listbox">';
				for(i = 0; i < n; i++){
					if(tmp[i].rank > 0) html += '<li data-id="'+tmp[i].key+'" aria-selected="'+(i==0 ? 'true':'false')+'" tabindex="-1"'+(typeof opt.setClass==="function" ? ' class="'+opt.setClass(items[tmp[i].key])+'"' : '')+'>'+(typeof opt.render==="function" ? opt.render(items[tmp[i].key]) : items[tmp[i].key])+"</li>";
				}
				html += "</ol>";
			}
			if(el){
				el.setAttribute('aria-expanded',(tmp.length > 0 ? 'true':'false'));
				el.setAttribute('aria-controls',el.id+'_listbox');
			}
			results.innerHTML = html;
			results.style.display = (n > 0) ? '' : 'hidden';

			// Add click events
			var li = getLi();
			for(i = 0 ; i < li.length ; i++) li[i].addEventListener('click',click);

			if(evs[t]){
				e._typeahead = _obj;
				// Process each of the events attached to this event
				for(i = 0; i < evs[t].length; i++){
					ev = evs[t][i];
					e.data = ev.data||{};
					if(typeof ev.fn==="function") ev.fn.call(ev.data['this']||this,e);
				}
			}

			return this;
		}

		function getLi(){ return (results ? results.querySelectorAll('li') : []); }
		
		function selectLI(i){
			if(i){
				if(items[i].__label) el.value = items[i].__label;
				_obj.input = el;
				if(typeof opt.process==="function") opt.process.call(_obj,items[i]);
				else console.log(items[i]);
			}
			if(results) results.innerHTML = "";
			return;
		}

		function submit(){
			var li = getLi();
			for(var i = 0; i < li.length; i++){
				if(li[i].getAttribute('aria-selected')=="true") return selectLI(li[i].getAttribute('data-id'));
			}
			return;
		}
		function highlight(keyCode){
			var li = getLi();
			var s = -1;
			var sel,bb_el,bb_ol;
			for(var i = 0; i < li.length; i++){
				if(li[i].getAttribute('aria-selected')=="true") s = i;
			}
			sel = s;
			if(keyCode==40) s++;
			else s--;
			if(s < 0) s = li.length-1;
			if(s >= li.length) s = 0;
			if(sel >= 0) li[sel].setAttribute('aria-selected','false');
			if(li[s]){
				li[s].setAttribute('aria-selected','true');
				bb_el = li[s].getBoundingClientRect();
				bb_ol = li[s].parentNode.parentNode.getBoundingClientRect();
				li[s].parentNode.parentNode.scrollTop = (li[s].parentNode.parentNode.scrollTop + (bb_el.top - bb_ol.top) - (bb_ol.height/2) + (bb_el.height/2)  );
			}
		}
		this.update = function(){
			var ev = document.createEvent('HTMLEvents');
			ev.initEvent('keyup', false, true);
			el.dispatchEvent(ev);
			return this;
		};
		this.on = function(event,data,fn){
			if(!el){
				console.warn('Unable to attach event '+event);
				return this;
			}
			if(event=="change"){
				if(!evs[event]){
					evs[event] = [];
					el.addEventListener('keyup',function(e){
						e.preventDefault();
						e.stopPropagation();
						if(e.keyCode==40 || e.keyCode==38){
							highlight(e.keyCode);
						}else if(e.keyCode==13){
							submit();
						}else{
							search(this.value,e,event);
							if(typeof opt.endsearch==="function") opt.endsearch(this.value);
						}
					});
					el.addEventListener('blur',function(e){
						if(typeof opt.blur==="function") opt.blur();
					});
				}
				evs[event].push({'fn':fn,'data':data});
			}else console.warn('No event of type '+event);
			return this;
		};
		this.trigger = function(eventType,e){
			if(typeof eventType === 'string' && typeof el[eventType] === 'function'){
				el[eventType]();
			}else{
				if(!e) e = typeof eventType === 'string' ? new Event(eventType, {bubbles: true}) : eventType;
				el.dispatchEvent(e);
			}
			return this;
		};
		this.off = function(e,fn){
			// Remove any existing event from our list
			if(evs[e]){
				for(var i = 0; i < evs[e].length; i++){
					if(evs[e][i].fn==fn) evs[e].splice(i,1);
				}
			}
		};
		if(el.form){
			frm = el.form;
			frm.addEventListener('submit',function(e){
				e.preventDefault();
				e.stopPropagation();
				submit();
			},false);
		}
		if(el){
			wrapper = wrap(el,'div');
			wrapper.classList.add('typeahead-wrapper');
			el.setAttribute('autocomplete','off');
			el.setAttribute('role','combobox');
			el.setAttribute('aria-expanded','false');
		}
		this.addItems = function(d){
			if(!items) items = [];
			for(var i = 0; i < d.length; i++){
				d[i].__label = (typeof opt.render==="function" ? opt.render(d[i]) : d[i]);
			}
			items = items.concat(d);
		};
		this.clearItems = function(){ items = []; };
		this.on('change',{},function(e){ });

		return this;
	}

	if(typeof root.TypeAhead==="undefined") root.TypeAhead = new Builder();

	function wrap(el,t) {
		var wrappingElement = document.createElement(t);
		el.replaceWith(wrappingElement);
		wrappingElement.appendChild(el);
		return wrappingElement;
	}

	// Sort the data
	function sortBy(arr,i){
		return arr.sort(function (a, b) {
			return a[i] < b[i] ? 1 : -1;
		});
	}
	/* End Typeahead */

})(window || this);