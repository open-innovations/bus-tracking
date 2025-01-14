/*
	Open Innovations Tooltip v0.5.3
	Helper function to add tooltips. A suitable candidate must:
		- be in an SVG
		- have a <title> child
		- the parent SVG must have a container
*/

(function(root){

	var styles = document.createElement('style');
	styles.innerHTML = '.tooltip {z-index:10000;color:black;filter:drop-shadow(0px 1px 1px rgba(0,0,0,0.7));text-align:left;}.tooltip .inner { padding: 1em; }';
	document.head.prepend(styles);

	if(!root.OI) root.OI = {};
	if(!root.OI.ready){
		root.OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	function add(el,to){ return to.appendChild(el); }
	function addEv(ev,el,data,fn){
		el.addEventListener(ev,function(e){
			e.data = data;
			fn.call(data.this||this,e);
		});
	}
	function addClasses(el,cl){
		for(var i = 0; i < cl.length; i++) el.classList.add(cl[i]);
		return el;
	}
	// Create a polyfill for furthest
	if (!Element.prototype.furthest) {
		Element.prototype.furthest = function(s){
			var el = this;
			var anc = null;
			while (el !== null && el.nodeType === 1) {
				if (el.matches(s)) anc = el;
				el = el.parentElement || el.parentNode;
			}
			return anc;
		};
	}

	function Tooltips(){
		var tips = [];
		var tip;
		var groups = [];
		this.locked = false;
		this.active = null;

		this.getGroup = function(el){
			for(var g = 0; g < groups.length; g++){
				if(groups[g].el==el) return groups[g];
			}
			return undefined;
		};

		this.makeGroup = function(el,attr){
			var group = this.getGroup(el);
			if(group===undefined){
				group = new TooltipGroup(this,el,attr);
				groups.push(group);
			}
			return group;
		};

		this.addGroup = function(el,selector,attr){
			if(!attr) attr = {};
			// Do we have this group?
			var group = this.makeGroup(el,attr);
			// If it is a string we convert it into an array of elements
			if(typeof selector==="string") selector = el.querySelectorAll(selector);
			// Add the selector to the group and then add the defined tips to our array
			tips.push.apply(tips, group.create(selector,attr));

			return this;
		};
		
		this.addGroupItem = function(el,selector,attr){
			if(!attr) attr = {};
			// Do we have this group?
			var group = this.makeGroup(el,attr);
			// Add the selector to the group
			var t = group.create([selector],{'notab':attr.notab||false,'show':attr.show||null});
			// Add the defined tips to our array
			tips.push.apply(tips, t);
			return t[0];
		};
		
		this.add = function(pt,attr){
			if(!attr) attr = {};
			attr._alltips = this;
			var tip = new Tooltip(pt,attr);
			tips.push(tip);
			return tip;
		};

		this.create = function(){
			if(!tip){
				tip = document.createElement('div');
				tip.innerHTML = '<div class="inner" style="background: #b2b2b2;position:relative;"></div><div class="arrow" style="position:absolute;width:0;height:0;border:0.5em solid transparent;border-bottom:0;left:50%;top:calc(100% - 1px);transform:translate3d(-50%,0,0);border-color:transparent;border-top-color:#aaaaaa;"></div>';
				addClasses(tip,['tooltip']);
			}
			return tip;
		};

		this.get = function(el){
			for(var t = 0; t < tips.length; t++){
				if(tips[t].el == el) return tips[t];
			}
			return false;
		};

		this.activate = function(el){
			var match = this.get(el);
			if(match){
				match.show();
				match.el.focus();//{preventScroll:true});
				match.lock();
			}
		};

		this.getTips = function(){ return tips; };

		this.update = function(){
			if(this.active) this.active.show();
		};

		this.clear = function(){
			if(!this.locked){
				if(tip && tip.parentNode) tip.parentNode.removeChild(tip);
				tip = null;
				this.active = null;
			}
			return this;
		};

		return this;
	}
	
	function TooltipGroup(_alltips,el,attr){
		this.el = el;
		this.tips = [];
		if(!attr) attr = {};
		// Set a tab index on the group
		el.setAttribute('tabindex',0);


		this.create = function(pts,attr){
			if(!attr) attr = {};
			var added = [];
			// Create placeholder tips
			for(var t = 0; t < pts.length; t++) added.push(this.add(pts[t],attr));
			return added;
		};
		this.add = function(pt,attr){
			if(!attr) attr = {};
			attr._group = this;
			attr._alltips = _alltips;
			var tip = new Tooltip(pt,attr);
			this.tips.push(tip);
			return tip;
		};
		this.clear = function(){
			_alltips.clear();
			//if(!_alltips.locked){
				for(var t = 0; t < this.tips.length; t++){
					if(this.tips[t]!==_alltips.active) this.tips[t].el.removeAttribute('tabindex');
				}
			//}
			return this;
		};

		addEv('keydown',el,{this:this,attr:attr},function(e){
			if(!attr.keymap) attr.keymap = {};
			if(e.key in attr.keymap){
				e.preventDefault();
				e.stopPropagation();
				attr.keymap[e.key].apply(this, [e, _alltips]);
			}
		});

		return this;
	}	// End of tooltip group class

	// An array to keep check of if we've added a clear() event to the tooltip holder
	var holders = [];

	function Tooltip(pt,attr){
		if(!pt){
			console.error('No point to attach to');
			return this;
		}
		this.el = pt;

		var svg,holder,tt,typ = "",tip,title,fill;
		svg = pt.furthest('svg');

		// Find the "data-type"
		if(svg) typ = svg.getAttribute('data-type');
		else svg = pt;

		attr._type = typ;
		holder = svg.parentNode;

		// If not a group it gets its own tabindex so that it can be navigated to
		if(!attr._group) this.el.setAttribute('tabindex',0);

		// Do we need to add the clear event to the holder?
		var added = false;
		for(var h = 0; h < holders.length; h++){
			if(holders[h]==holder) added = true;
		}
		if(!added){
			addEv('mouseleave',holder,{'this':this},function(e){ this.clear(); });
			holders.push(holder);
		}

		// If it isn't part of a group make it tabbable
		if(!attr._group) pt.setAttribute('tabindex',0);

		this.attr = attr;

		this.setAttr = function(attrib){
			if(!attrib) attrib = {};
			for(var a in attrib) attr[a] = attrib[a];
			return this;
		};

		this.getAttr = function(a){
			if(a in attr) return attr[a];
			return undefined;
		};

		if(attr.coord_attributes !== undefined) {
			this.x = parseFloat(this.el.getAttribute(attr.coord_attributes[0]));
			this.y = parseFloat(this.el.getAttribute(attr.coord_attributes[1]));
		}

		this.show = function(cb){
			var box,arr,pt2,t;

			pt2 = pt.querySelector('path,.marker');
			if(!pt2) pt2 = pt;

			// Get tooltip content
			tt = this.getTooltip(pt2);

			if(!tt){
				console.warn('No tooltip content found for ',pt);
				return this;
			}
			
			if(attr._group){
				for(t = 0; t < attr._group.tips.length; t++){
					if(pt!=attr._group.tips[t].el) attr._group.tips[t].el.removeAttribute('tabindex');
					else{
						if(!attr.notab) pt.setAttribute('tabindex',0);
					}
				}
			}
			pt.setAttribute('aria-label',tt.replace(/<br[\\\s]*>/g,'; ').replace(/<[^\>]+>/g,' '));

			// Set the position of the holder element
			holder.style.position = 'relative';

			// Create the tip (only one can exist)
			tip = attr._alltips.create();

			// Add the tip to the holder
			add(tip,holder);

			// Get the fill colour from the data-fill attribute
			fill = pt.getAttribute('data-fill');
			// If nothing, try the fill attribute
			if(!fill) fill = pt.getAttribute('fill');
			if(!fill && pt.querySelector('path,.marker')){
				fill = pt.querySelector('path,.marker').getAttribute('data-fill');
				if(!fill) fill = pt.querySelector('path,.marker').getAttribute('fill');
			}
			// If no fill try the fill of the nearest SVG element
			if(!fill && pt2.closest('svg')) fill = pt2.closest('svg').getAttribute('fill');
			// If the fill is "currentColor" we compute what that is
			if(fill == "currentColor") fill = window.getComputedStyle(pt2).color;
			if(fill == "transparent" && pt2.getAttribute('data-fill')) fill = pt2.getAttribute('data-fill');
			// If the fill is empty try computing the fill
			if(!fill) fill = window.getComputedStyle(pt2).fill;

			// Get the contents now (in case they've been updated)
			title = (tt || "").replace(/[\n\r]/g,'<br />');

			box = tip.querySelector('.inner');
			arr = tip.querySelector('.arrow');

			// Set the contents
			box.innerHTML = (title);

			box.style.background = fill;
			box.style.transform = 'none';
			arr.style['border-top-color'] = fill;

			// If the colour is similar to black we need to change the tooltip filter
			if(fill && contrastRatio(colour2RGB(fill),[0,0,0]) < 2){
				box.style.border = "1px solid rgba(255,255,255,0.3)";
				box.style.borderBottom = "0";
			}else{
				box.style.border = "0px";
			}

			box.style.color = (fill && root.OI.contrastColour ? root.OI.contrastColour(fill) : "black");

			this.position();

			if(typeof attr.show==="function") attr.show.call(this,pt,attr);
			if(typeof cb==="function") cb.call(this,pt,attr);
			attr._alltips.active = this;

			return this;
		};

		// Update the position of the tooltip
		this.position = function(){
			var bb,bbo,bbox,box,arr,wide,off,pad,shift;
			// Fix for situations where body is not full window width or has margins, this breaks tooltips.
			wide = document.body.getBoundingClientRect().right;

			box = tip.querySelector('.inner');
			arr = tip.querySelector('.arrow');

			// Position the tooltip
			bb = pt.getBoundingClientRect();	// Bounding box of the element
			bbo = holder.getBoundingClientRect(); // Bounding box of SVG holder

			off = 4;
			pad = 8;
			if(typ=="bar-chart" || typ=="stacked-bar-chart") off = bb.height/2;
			if(typ=="hex-map") off = (bb.height/2);
			if(typ=="tree-map") off = (bb.height/2);
			if(typ=="calendar-chart") off = (bb.height/2);
			if(typ=="waffle-chart") off = (bb.height/2);

			// Set tooltip position, with awareness of element scaling
			// In scoped block to avoid pollution of top-level namespace with new variables.
			{
				var scaleX = holder.getBoundingClientRect().width / holder.offsetWidth;
				var scaleY = holder.getBoundingClientRect().height / holder.offsetHeight;
				var leftPos = (bb.left + bb.width/2 - bbo.left) / scaleX;
				var topPos = (bb.top + bb.height/2 - bbo.top) / scaleY;
				off = off / scaleY;
				tip.dataset.left=leftPos;
				tip.dataset.top=topPos;
				tip.setAttribute('style','position:absolute;left:'+(leftPos.toFixed(2))+'px;top:'+(topPos.toFixed(2))+'px;display:'+(title ? 'block':'none')+';transform:translate3d(-50%,calc(-100% - '+off+'px),0);transition:all 0s;');
			}


			// Remove wrapping if the tip is wider than the page minus the padding
			box.style.whiteSpace = (tip.offsetWidth > wide - 2*pad) ? 'none' : 'nowrap';

			// Limit width of tooltip to window width - 2*pad
			if(tip.offsetWidth > wide - 2*pad){
				tip.style.width = (wide - 2*pad)+'px';
				box.style.whiteSpace = 'normal';
			}else{
				tip.style.width = '';
			}


			// Find out where the tooltip is now
			bbox = tip.getBoundingClientRect();

			// Set tooltip transform
			// If we were to just position the overall tooltip then shift the contents, we 
			// gain a horizontal scroll bar on the page when the tooltip is off the right-hand-side.
			// Instead we calculate the required shift and apply it to the tooltip and the 
			// arrow in opposite senses to keep the arrow where it needs to be
			shift = 0;
			if(bbox.left < pad) shift = (pad-bbox.left);
			else if(bbox.right > wide-pad) shift = -(bbox.right-wide+pad);
			if(bbox.top > pad){
				// Tooltip is comfortably on the screen
				tip.style.top = (bb.top + bb.height/2 - bbo.top).toFixed(2)+'px';
				tip.style.transform = 'translate3d('+(shift == 0 ? '-50%' : 'calc(-50% + ' + shift + 'px)')+',calc(-100% - '+off+'px - 0.75em),0)';
				arr.style.transform = 'translate3d(calc(-50% - ' + shift + 'px),0,0)';
				arr.style.top = 'calc(100% - 1px)';
				arr.style['border-top'] = '0.5em solid '+fill;
				arr.style['border-right'] = '0.5em solid transparent';
				arr.style['border-bottom'] = '';
				arr.style['border-left'] = '0.5em solid transparent';
			}else{
				// Tooltip is off the top of the screen
				tip.style.top = (bb.top + bb.height/2 - bbo.top).toFixed(2)+'px';
				tip.style.transform = 'translate3d('+(shift == 0 ? '-50%' : 'calc(-50% + ' + shift + 'px)')+',calc('+(off)+'px + 0.75em),0)';
				arr.style.transform = 'translate3d(calc(-50% - ' + shift + 'px),-100%,0)';
				arr.style.top = '1px';
				arr.style['border-top'] = '';
				arr.style['border-right'] = '0.5em solid transparent';
				arr.style['border-bottom'] = '0.5em solid '+fill;
				arr.style['border-left'] = '0.5em solid transparent';
			}

			return this;
		};

		this.getTooltip = function(pt2){
			if(!pt2){
				pt2 = pt.querySelector('path,.marker');
				if(!pt2) pt2 = pt;
			}
			var tt = "";
			if(!tt && pt2.querySelector('title')) tt = pt2.querySelector('title').innerHTML;
			if(!tt && pt.querySelector('title')) tt = pt.querySelector('title').innerHTML;
			if(!tt) tt = pt.getAttribute('title');
			if(!tt) tt = pt.getAttribute('aria-label');
			if(!tt) tt = pt2.getAttribute('aria-label');
			return tt;
		};

		this.clear = function(){
			if(attr._group) attr._group.clear();
			else attr._alltips.clear();

			if(typeof attr.clear==="function" && !attr._alltips.locked) attr.clear.call(this,pt,attr);
		};

		this.lock = function(){
			// Unlock if necessary
			if(attr._alltips.locked) this.unlock();
			// Set this as locked
			attr._alltips.locked = this;
			// Add a class
			pt.classList.add('selected');
			svg.classList.add('locked');
			return this;
		};

		this.unlock = function(){
			attr._alltips.locked = null;
			var els = svg.querySelectorAll('.selected');
			for(var j = 0; j < els.length; j++) els[j].classList.remove('selected');
			svg.classList.remove('locked');
			return this;
		};

		this.toggle = function(){
			// Always reset any existingly selected items and turn off sticky
			if(this==attr._alltips.active) this.clear();
			else this.show();
			return this;
		};
		
		this.toggleLock = function(){
			return attr._alltips.locked ? this.unlock() : this.lock();
		};


		if(('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)){
			// Touch to toggle a tooltip
			addEv('touchstart',pt,{'this':this},function(e){ e.stopPropagation(); this.toggle(); });
		}else{
			// Add events
			addEv('click',pt,{'this':this,attr:attr},function(e){
				e.preventDefault();
				e.stopImmediatePropagation();
				var samehex = (e.data.attr._alltips && "locked" in e.data.attr._alltips && typeof e.data.attr._alltips.locked==="object" && e.data.attr._alltips.locked!=null && this.el==e.data.attr._alltips.locked.el);
				if(samehex) this.unlock();
				this.toggle();
				this.show();
				if(!samehex) this.lock();
			});
		}
		addEv('focus',pt,{'this':this},function(e){ e.preventDefault(); e.stopPropagation(); this.show(); });
		addEv('mouseover',(attr['hover-element']||pt),{'this':this},function(e){ e.preventDefault(); e.stopPropagation(); if(!attr._alltips.locked){ this.show(); } });

		return this;
	}	// End of tooltip class

	if(!root.OI.Tooltips) root.OI.Tooltips = new Tooltips();

	window.addEventListener('resize',function(){
		if(OI.Tooltips && OI.Tooltips.active) OI.Tooltips.active.position();
	});


	function h2d(h) {return parseInt(h,16);}
	function toLin(v){ v /= 255; if (v <= 0.03928){ return v/12.92; }else{ return Math.pow((v+0.055)/1.055,2.4); }}
	function rLum(rgb){ return 0.2126 * toLin(rgb[0]) + 0.7152 * toLin(rgb[1]) + 0.0722 * toLin(rgb[2]); }
	function contrastRatio(a, b){ let L1 = rLum(a); let L2 = rLum(b); if(L1 < L2){ let temp = L2; L2 = L1; L1 = temp; } return (L1 + 0.05) / (L2 + 0.05); }
	function colour2RGB(c){
		var rgb = [];
		if(c.indexOf('#')==0){
			rgb = [h2d(c.substring(1,3)),h2d(c.substring(3,5)),h2d(c.substring(5,7))];
		}else if(c.indexOf('rgb')==0){
			var bits = c.match(/[0-9\.]+/g);
			if(bits.length == 4) this.alpha = parseFloat(bits[3]);
			rgb = [parseInt(bits[0]),parseInt(bits[1]),parseInt(bits[2])];
		}
		return rgb;
	}
	function contrastColour(c){ let rgb = colour2RGB(c); return (contrastRatio(rgb,[0, 0, 0]) > contrastRatio(rgb,[255, 255, 255]) ? "black" : "white"); }
	if(!root.OI.contrastColour) root.OI.contrastColour = contrastColour;
})(window || this);