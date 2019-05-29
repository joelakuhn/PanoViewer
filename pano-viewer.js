"use strict";

const MAX_ZOOM = 15;
const MIN_ZOOM = 80;

function PanoViewer(element, textureUrl) {
	this.element = element; // Inject this.scene into this

	this.camera = null;
	this.scene = null;
	this.renderer = null;

	this.onPointerDownPointerX = null;
	this.onPointerDownPointerY = null;
	this.onPointerDownLon = null;
	this.onPointerDownLat = null;

	this.onMouseDownMouseX = 0;
	this.onMouseDownMouseY = 0;
	this.pinchStartDistance = 0;

	this.fov = 70; // Field of View
	this.lon = 0;
	this.lat = 0;
	this.phi = 0;
	this.theta = 0;

	this.isUserInteracting = false;
	this.hasUserInteracted = false;

	this.movementLog = [];
	this.interactionEvents = [];

	this.width = 650;
	this.height = 650;
	this.maxHeight = 650;
	this.ratio = this.width / this.height;

	this.overlayElement = null;

	var _this = this;
	this.texture = new THREE.TextureLoader().load(textureUrl, function() {
		_this.init();
		_this.animate();
	});
	this.initCSS();
}

// Init

PanoViewer.prototype.initCSS = function() {
	this.element.style.position = 'relative';
	this.element.style.height = this.maxHeight + 'px';
}

PanoViewer.prototype.init = function() {
	// 3js Scene
	this.camera = new THREE.PerspectiveCamera(this.fov, this.ratio, 1, 1000);
	this.scene = new THREE.Scene();
	this.texture.minFilter = THREE.LinearFilter;
	var mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 60, 40), new THREE.MeshBasicMaterial({map: this.texture}));
	mesh.scale.y = -1;
	mesh.scale.x = -1;
	this.scene.add(mesh);
	this.renderer = new THREE.WebGLRenderer({antialias: true});
	this.renderer.setSize(this.width, this.height);
	this.element.appendChild(this.renderer.domElement);

	// Overlay
	this.createPanoOverlay();

	// Resizing
	this.bindEvent(window, 'resize', this.onWindowResized, false);
	this.onWindowResized(null);
}

PanoViewer.prototype.bindUserInteractionEvents = function() {
	// Start Panning
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'mousedown', this.onMouseDown));
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'touchstart', this.onMouseDown));

	// Panning
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'mousemove', this.onMouseMove));
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'touchmove', this.onMouseMove));

	// Stop Panning
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'mouseup', this.onMouseUp));
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'touchend', this.onMouseUp));
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'mouseup', this.onMouseUp));
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'mouseout', this.onMouseUp));

	// Zooming
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'mousewheel', this.onMouseWheel));
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'DOMMouseScroll', this.onMouseWheel));
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'MozMousePixelScroll', this.onMouseWheel));

	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'touchmove', this.onPinch));
	this.interactionEvents.push(this.bindEvent(this.renderer.domElement, 'touchend', this.onPinchEnd));
}

PanoViewer.prototype.unbindUserInteractionEvents = function() {
	while (this.interactionEvents.length > 0) {
		var ev = this.interactionEvents.pop();
		this.renderer.domElement.removeEventListener(ev[0], ev[1]);
	}
}

// Helpers

PanoViewer.prototype.bindEvent = function(target, event, callback, capture) {
	var _this = this;
	var boundCallback = function(event) {
		callback.apply(_this, [event]);
	}
	target.addEventListener(event, boundCallback, !!capture);
	return [event, boundCallback];
}

PanoViewer.prototype.getInteractionEventObject = function(event) {
	if ('touches' in event) {
		return event.touches.length > 1
		? null
		: event.touches[0];
	}
	return event;
}

PanoViewer.prototype.updateProjection = function() {
	var near = 1;
	var far = 1000;
	var ymax = near * Math.tan( THREE.Math.degToRad( this.fov * 0.5 ) );
	var ymin = - ymax;
	var xmin = ymin * this.ratio;
	var xmax = ymax * this.ratio;
	this.camera.projectionMatrix.makePerspective(xmin, xmax, ymin, ymax, near, far);
}

// Overlay

PanoViewer.prototype.createPanoOverlay = function() {
	this.overlayElement = document.createElement('button');
	this.overlayElement.setAttribute('class', 'pano-overlay');
	this.overlayElement.innerText = 'Tap to Interact';
  this.overlayElement.setAttribute(
  	'style',
  	'position: absolute; top: 0; right: 0; width: 100%; height: 100%;'
  	+ 'font-size: 2em; font-weight: lighter;'
  	+ 'background-color: rgba(0,0,0,0.2); border: 0; color: #fff;');
  this.bindEvent(this.overlayElement, 'click', this.togglePanoOverlay, false);

	this.element.appendChild(this.overlayElement);
}

PanoViewer.prototype.togglePanoOverlay = function() {
	var cls = this.overlayElement.getAttribute('class');
	if (!cls.match(/interacting/)) {
		this.hasUserInteracted = true;
		this.overlayElement.setAttribute('class', cls + ' interacting');
		this.overlayElement.innerHTML =
			'<span style="position: absolute; height: 0; width: 0; left: -10000px;">Stop Panoramic</span>'
			+ '<span style="font-family: arial;">&#x2715;</span>';
		this.overlayElement.style.width = '2em';
		this.overlayElement.style.height = '2em';
		this.scrollIntoView();
		this.bindUserInteractionEvents();
	}
	else {
		this.overlayElement.setAttribute('class', 'pano-overlay');
		this.overlayElement.innerText = 'Tap to Interact';
		this.overlayElement.style.width = '100%';
		this.overlayElement.style.height = '100%';

		this.unbindUserInteractionEvents();
	}
}

PanoViewer.prototype.scrollIntoView = function() {
	if (this.element.offsetTop < window.scrollY) {
		var _this = this;
		var newY = Math.max(window.scrollY - 20, this.element.offsetTop);
		window.scrollTo(window.scrollX, newY);
		requestAnimationFrame(function() {
			_this.scrollIntoView();
		});
	}
}

// Window Resize

PanoViewer.prototype.onWindowResized = function(event) {
	var elWidth = this.element.clientWidth;
	var elHeight = this.element.clientHeight;
	var winHeight = window.innerHeight;
	if (winHeight < elHeight) {
		elHeight = winHeight - 50;
		this.element.style.height = elHeight + "px";
	}
	else if (elHeight < (winHeight - 50) && elHeight < this.maxHeight) {
		elHeight = Math.min(this.maxHeight, winHeight - 50);
		this.element.style.height = elHeight + "px";

	}
	this.ratio = elWidth / elHeight;
	this.renderer.setSize(elWidth, elHeight);
	this.updateProjection();
	this.render();
}

// Panning

PanoViewer.prototype.onMouseDown = function(event) {
	event.preventDefault();
	var interaction = this.getInteractionEventObject(event);
	if (interaction == null) return;
	this.onPointerDownPointerX = interaction.clientX;
	this.onPointerDownPointerY = interaction.clientY;
	this.onPointerDownLon = this.lon;
	this.onPointerDownLat = this.lat;
	this.isUserInteracting = true;
	this.stopDriftOut();
	return false;
}
PanoViewer.prototype.onMouseMove = function(event) {
	if (!this.isUserInteracting) return;

	var interaction = this.getInteractionEventObject(event);
	if (interaction == null) return;

	this.lon = (interaction.clientX - this.onPointerDownPointerX) * -0.175 + this.onPointerDownLon;
	this.lat = -(interaction.clientY - this.onPointerDownPointerY) * -0.175 + this.onPointerDownLat;
	this.movementLog.push([this.lat, this.lon]);

	this.render();
	return false;
}
PanoViewer.prototype.onMouseUp = function(event) {
	if (!this.isUserInteracting) return;

	this.startDriftOut();

	var interaction = this.getInteractionEventObject(event);
	if (interaction == null) return;

	this.isUserInteracting = false;
	return false;
}

// Scrolling

PanoViewer.prototype.onMouseWheel = function(event) {
	event.preventDefault();
	// WebKit
	if (event.wheelDeltaY) {
		this.fov -= event.wheelDeltaY * 0.05;
		// Opera / Explorer 9
	} else if (event.wheelDelta) {
		this.fov -= event.wheelDelta * 0.05;
		// Firefox
	} else if (event.detail) {
		this.fov += event.detail * 1.0;
	}
	if (this.fov < MAX_ZOOM || this.fov > MIN_ZOOM) {
		this.fov = (this.fov < MAX_ZOOM) ? MAX_ZOOM : MIN_ZOOM;
	}
	this.updateProjection();
	this.render();
	return false;
}
PanoViewer.prototype.onPinch = function(event) {
	if (event.touches.length === 2) {
		if (this.pinchStartDistance === 0) {
			this.pinchStartDistance = Math.hypot(
				event.touches[0].pageX - event.touches[1].pageX,
				event.touches[0].pageY - event.touches[1].pageY);
			this.pinchStartFov = this.fov
		}
		else {
			var dist = Math.hypot(
				event.touches[0].pageX - event.touches[1].pageX,
				event.touches[0].pageY - event.touches[1].pageY);
			this.fov = this.pinchStartFov * this.pinchStartDistance/dist;
			if (this.fov < MAX_ZOOM || this.fov > MIN_ZOOM) {
				this.fov = (this.fov < MAX_ZOOM) ? MAX_ZOOM : MIN_ZOOM;
			}
			this.updateProjection();
		}
	}
	this.render();
	return false;
}
PanoViewer.prototype.onPinchEnd = function(event) {
	if (event.touches.length === 1) {
		this.pinchStartDistance = 0;
	}
}

// Momentum

PanoViewer.prototype.startDriftOut = function() {
	if (this.movementLog.length < 2) return;
	var end = this.movementLog.pop();
	var start = this.movementLog.pop();
	this.dlat = end[0] - start[0];
	this.dlon = end[1] - start[1];
	this.movementLog = [];
	this.driftOut();
}

PanoViewer.prototype.stopDriftOut = function() {
	this.movementLog = [];
	this.dlat = 0;
	this.dlon = 0;
	if (this.driftFrame) {
		cancelAnimationFrame(this.driftFrame);
	}
}

PanoViewer.prototype.driftOut = function() {
	var _this = this;

	if (Math.abs(this.dlon) < 0.1 && Math.abs(this.dlat) < 0.1) return;

	this.lat = this.lat + this.dlat;
	this.lon = this.lon + this.dlon;

	this.dlon /= 1.1;
	this.dlat /= 1.1;

	this.render();

	this.driftFrame = requestAnimationFrame(function() {
		_this.driftOut();
	});
}

// Initial camera drift to indicate this is a pannable image.

PanoViewer.prototype.animate = function() {
	if (this.hasUserInteracted === false) {
		this.lon += 0.05;
		this.render();
		var _this = this;
		requestAnimationFrame(function() {
			_this.animate();
		});
	}
}

// Draw Screean

PanoViewer.prototype.render = function() {
	this.lat = Math.max(-85, Math.min(85, this.lat));
	this.phi = THREE.Math.degToRad(90 - this.lat);
	this.theta = THREE.Math.degToRad(this.lon);
	this.camera.position.x = 100 * Math.sin(this.phi) * Math.cos(this.theta);
	this.camera.position.y = 100 * Math.cos(this.phi);
	this.camera.position.z = 100 * Math.sin(this.phi) * Math.sin(this.theta);
	this.camera.lookAt(this.scene.position);
	this.renderer.render(this.scene, this.camera);
}

// Auto-init .pano-viewer[data-src] elements.

var viewer_elements = document.getElementsByClassName('pano-viewer');
for (var i=0; i<viewer_elements.length; i++) {
	var src = viewer_elements[i].getAttribute('data-src');
	if (src) {
		new PanoViewer(viewer_elements[i], src);
	}
}

