"use strict";

const MAX_ZOOM = 15;
const MIN_ZOOM = 80;

function PanoViewer(element, textureUrl) {
	this.camera = null;
	this.scene = null;
	this.element = element; // Inject this.scene into this
	this.renderer = null;
	this.onPointerDownPointerX = null;
	this.onPointerDownPointerY = null;
	this.onPointerDownLon = null;
	this.onPointerDownLat = null;
	this.fov = 70; // Field of View
	this.isUserInteracting = false;
	this.hasUserInteracted = false;
	this.lon = 0;
	this.lat = 0;
	this.movementLog = [];
	this.phi = 0;
	this.theta = 0;
	this.onMouseDownMouseX = 0;
	this.onMouseDownMouseY = 0;
	this.pinchStartDistance = 0;
	this.interactionEvents = [];
	this.width = 650; // int || window.innerWidth
	this.height = 650; // int || window.innerHeight
	this.ratio = this.width / this.height;
	this.overlayElement = null;
	var _this = this;
	this.texture = new THREE.TextureLoader().load(textureUrl, function() {
		_this.init();
		// _this.animate();
	});
}

// Init

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

	this.render();
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
	this.bindEvent(this.overlayElement, 'click', this.togglePanoOverlay, false);

	this.element.appendChild(this.overlayElement);
}
PanoViewer.prototype.togglePanoOverlay = function() {
	var cls = this.overlayElement.getAttribute('class');
	if (!cls.match(/interacting/)) {
		this.overlayElement.setAttribute('class', cls + ' interacting');
		this.overlayElement.innerHTML = '<span class="sr-only">Stop Panoramic</span>&#x2715;';
		this.scrollIntoView();
		this.bindUserInteractionEvents();
	}
	else {
		this.overlayElement.setAttribute('class', 'pano-overlay');
		this.overlayElement.innerText = 'Tap to Interact';
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
	this.hasUserInteracted = true;
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

// Draw Screean

PanoViewer.prototype.render = function() {
	if (this.hasUserInteracted === false) {
		this.lon += .05;
	}
	this.lat = Math.max(-85, Math.min(85, this.lat));
	this.phi = THREE.Math.degToRad(90 - this.lat);
	this.theta = THREE.Math.degToRad(this.lon);
	this.camera.position.x = 100 * Math.sin(this.phi) * Math.cos(this.theta);
	this.camera.position.y = 100 * Math.cos(this.phi);
	this.camera.position.z = 100 * Math.sin(this.phi) * Math.sin(this.theta);
	this.camera.lookAt(this.scene.position);
	this.renderer.render(this.scene, this.camera);
}

window.pano = new PanoViewer(document.getElementById('demo'), 'img/warrior-row-c-compressed.jpg');
// window.pano = new PanoViewer(document.getElementById('demo'), 'img/warrior-row-c-compressed.jpg');
// new PanoViewer(document.getElementById('demo'), 'img/pierson.jpg');
