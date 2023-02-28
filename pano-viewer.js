"use strict";

const MAX_ZOOM = 15;
const MIN_ZOOM = 80;

function PanoViewer(element, textureUrl, callback) {
  this.element = element;
  this.canvas = null;

  this.camera = null;
  this.scene = null;
  this.renderer = null;
  this.reticle = null;

  this.bubbles = null;

  this.onPointerDownPointerX = null;
  this.onPointerDownPointerY = null;
  this.onPointerDownLon = null;
  this.onPointerDownLat = null;

  this.onMouseDownMouseX = 0;
  this.onMouseDownMouseY = 0;
  this.pinchStartDistance = 0;

  this.fov = 60; // Field of View
  this.lon = 0;
  this.lat = 0;
  this.phi = 0;
  this.theta = 0;

  this.driftFriction = 0.92;
  this.minDrift = 0.05;

  this.bubbleScale = 1.0;
  this.pulseDirection = 1.0;

  this.isUserInteracting = false;
  this.hasUserInteracted = false;

  this.movementLog = [];
  this.interactionEvents = [];

  this.width = element.clientWidth;
  this.height = 650;
  this.maxHeight = 650;
  this.ratio = this.width / this.height;

  this.raycaster = new THREE.Raycaster();

  this.overlayElement = null;

  this.init();
  this.animate();

  var _this = this;
  this.texture = new THREE.TextureLoader().load(textureUrl, function() {
    _this.init_image();
    if (callback) callback(_this);
  });
  this.initCSS();
}

// Init

PanoViewer.prototype.initCSS = function() {
  this.element.style.position = 'relative';
  this.element.style.overflow = 'hidden';
  this.element.style.height = this.maxHeight + 'px';
}

PanoViewer.prototype.init = function() {
  this.camera = new THREE.PerspectiveCamera(this.fov, this.ratio, 1, 1000);
  this.scene = new THREE.Scene();

  this.bubbles = new THREE.Group();
  this.scene.add(this.bubbles);

  var reticle_geometry = new THREE.SphereGeometry(.5, 6, 40);
  var reticle_texture = new THREE.MeshBasicMaterial({ color: 0xffffff });
  reticle_texture.transparent = true;
  reticle_texture.opacity = .4;
  this.reticle = new THREE.Mesh(reticle_geometry, reticle_texture);
  this.reticle.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
  this.scene.add(this.reticle);

  // Add lighting
  var light = new THREE.DirectionalLight( 0xffffff, .8 );
  var underlight = new THREE.AmbientLight( 0xffffff, .8 );
  light.position.set(0, -100, 0);
  this.scene.add( light );
  this.scene.add( underlight );

  // Initialize Renderer
  this.renderer = new THREE.WebGLRenderer({antialias: true});
  this.renderer.setSize(this.width, this.height);
  this.element.appendChild(this.renderer.domElement);
  this.canvas = this.renderer.domElement;

  this.pulseBubbles();

  // Overlay
  this.createPanoOverlay();

  // Resizing
  this.bindEvent(window, 'resize', this.onWindowResized, false);
  this.onWindowResized(null);
}

PanoViewer.prototype.init_image = function() {
  var image_mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 60, 40), new THREE.MeshBasicMaterial({map: this.texture}));
  this.texture.minFilter = THREE.LinearFilter;
  image_mesh.scale.y = -1;
  image_mesh.scale.x = -1;
  this.scene.add(image_mesh);
}

PanoViewer.prototype.bindUserInteractionEvents = function() {
  // Start Panning
  this.interactionEvents.push(this.bindEvent(this.canvas, 'mousedown', this.onMouseDown));
  this.interactionEvents.push(this.bindEvent(this.canvas, 'touchstart', this.onMouseDown));

  // Panning
  this.interactionEvents.push(this.bindEvent(this.canvas, 'mousemove', this.onMouseMove));
  this.interactionEvents.push(this.bindEvent(this.canvas, 'touchmove', this.onMouseMove));

  // Stop Panning
  this.interactionEvents.push(this.bindEvent(this.canvas, 'mouseup', this.onMouseUp));
  this.interactionEvents.push(this.bindEvent(this.canvas, 'touchend', this.onMouseUp));
  this.interactionEvents.push(this.bindEvent(this.canvas, 'mouseup', this.onMouseUp));
  this.interactionEvents.push(this.bindEvent(this.canvas, 'mouseout', this.onMouseUp));

  // // Zooming
  // this.interactionEvents.push(this.bindEvent(this.canvas, 'mousewheel', this.onMouseWheel));
  // this.interactionEvents.push(this.bindEvent(this.canvas, 'DOMMouseScroll', this.onMouseWheel));
  // this.interactionEvents.push(this.bindEvent(this.canvas, 'MozMousePixelScroll', this.onMouseWheel));

  // this.interactionEvents.push(this.bindEvent(this.canvas, 'touchmove', this.onPinch));
  // this.interactionEvents.push(this.bindEvent(this.canvas, 'touchend', this.onPinchEnd));

  // this.enableDebug();
}

PanoViewer.prototype.unbindUserInteractionEvents = function() {
  while (this.interactionEvents.length > 0) {
    var ev = this.interactionEvents.pop();
    this.canvas.removeEventListener(ev[0], ev[1]);
  }
}

PanoViewer.prototype.updateRaycaster = function(x, y) {
  var mouse = new THREE.Vector2(
    (x / this.canvas.clientWidth) * 2 - 1,
    (y / this.canvas.clientHeight) * 2 - 1
  );

  this.raycaster.setFromCamera(mouse, this.camera);
}

PanoViewer.prototype.findIntersects = function() {
  var intersects = this.raycaster.intersectObjects(this.bubbles.children);
  return intersects;
}

PanoViewer.prototype.getOffset = function(el) {
  var offsetTop = 0;
  var offsetLeft = 0;
  var offsetEl = el;
  do {
    offsetLeft += offsetEl.offsetLeft;
    offsetTop += offsetEl.offsetTop;
  } while(offsetEl = offsetEl.offsetParent);

  return { left: offsetLeft, top: offsetTop };
}

PanoViewer.prototype.getClientOffset = function(el) {
  var offset = this.getOffset(el);

  var scrollEl = el;
  do {
    offset.left -= scrollEl.scrollLeft;
    offset.top -= scrollEl.scrollTop;
  } while(scrollEl = scrollEl.parentElement);

  // the <html> element is not treated as an offsetParent, so we need to manually
  // account for margin on that element since WP injects it for the admin bar.
  var docStyle = document.documentElement.currentStyle || window.getComputedStyle(document.documentElement);
  offset.left += docStyle.marginLeft ? Number.parseInt(docStyle.marginLeft) : 0;
  offset.top += docStyle.marginTop ? Number.parseInt(docStyle.marginTop) : 0;

  return offset;
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
    if (event.touches.length === 1)
      return event.touches[0];
    else if (event.touches.length === 0 && event.changedTouches.length === 1)
      return event.changedTouches[0];
    return null
  }
  return event;
}

PanoViewer.prototype.updateProjection = function() {
  var near = 1;
  var far = 1000;
  var ymax = near * Math.tan(THREE.MathUtils.degToRad(this.fov/2));
  var ymin = - ymax;
  var xmin = ymin * this.ratio;
  var xmax = ymax * this.ratio;
  this.camera.fov = this.fov;
  this.camera.aspect = this.ratio;
  this.camera.updateProjectionMatrix();
  this.camera.projectionMatrix.makePerspective(xmin, xmax, ymin, ymax, near, far);
}

PanoViewer.prototype.rotateOrthogonalToOrigin = function(obj) {
  var sph = new THREE.Spherical().setFromVector3(obj.position);
  obj.rotation.set(-(Math.PI / 2 - sph.phi), sph.theta, 0)
}

PanoViewer.prototype.createBubble = function(name, phi, theta)  {
  var bubble_geometry = new THREE.SphereGeometry(10, 32, 32);
  var bubble_material = new THREE.MeshLambertMaterial({
    // color: 0xfa4616,
    color: 0x0088FF,
    transparent: true,
    opacity: .4
  });
  var bubble = new THREE.Mesh(bubble_geometry, bubble_material);
  var phi_rad = - (phi / 180) * Math.PI;
  var theta_rad = (theta / 180) * Math.PI;
  bubble.position.setFromSphericalCoords(475, phi_rad, theta_rad);
  bubble.name = name;

  this.bubbles.add(bubble);

  return bubble;
}

PanoViewer.prototype.pulseBubbles = function() {
  var increment = .003;
  if (this.bubbleScale <= .8) this.pulseDirection = increment;
  else if (this.bubbleScale >= 1) this.pulseDirection = - increment;
  this.bubbleScale += this.pulseDirection;
  for (var i=0; i<this.bubbles.children.length; i++) {
    this.bubbles.children[i].scale.setScalar(this.bubbleScale);
    this.render();
  }
  var _this = this;
  requestAnimationFrame(function() {
    _this.pulseBubbles();
  });
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

PanoViewer.prototype.togglePanoOverlay = function(show) {
  var cls = this.overlayElement.getAttribute('class');
  show = show === true || cls.match(/interacting/);
  
  var statechange = new Event('statechange', { cancelable: true });
  statechange.is_interacting = !show;

  if (this.element.dispatchEvent(statechange)) {
    if (!show) {
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
}

PanoViewer.prototype.scrollIntoView = function() {
  var offset = this.getOffset(this.element);
  if (offset.top < window.scrollY) {
    var _this = this;
    var newY = Math.max(window.scrollY - 20, offset.top);
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

  if (this.movementLog.length < 2) {
    var clickEvent = this.getInteractionEventObject(event);
    var offset = this.getClientOffset(this.canvas);
    this.updateRaycaster(clickEvent.clientX - offset.left, clickEvent.clientY - offset.top)
    var intersects = this.findIntersects()
    var ray = new THREE.Spherical().setFromVector3(this.raycaster.ray.direction);
    ray.theta = (ray.theta + Math.PI) % (2*Math.PI);

    if (intersects.length === 0) {
      var sceneclick = new Event('sceneclick');
      sceneclick.mouseEvent = clickEvent;
      sceneclick.ray = ray;
      this.canvas.dispatchEvent(sceneclick);

      console.log({ x: clickEvent.clientX, y: clickEvent.clientY });
      console.log(offset);
      console.log(clickEvent.clientX - offset.left, clickEvent.clientY - offset.top);
      console.log(Math.round(THREE.MathUtils.radToDeg(sceneclick.ray.phi) * 100)/100 + ", " + (Math.round(THREE.MathUtils.radToDeg(sceneclick.ray.theta) * 100) / 100));
    }
    else {
      for (var i=0; i<intersects.length; i++) {
        var bubbleclick = new Event('bubbleclick');
        bubbleclick.mouseEvent = clickEvent;
        bubbleclick.bubble = intersects[i].object;
        bubbleclick.bubble_name = intersects[i].object.name;
        this.canvas.dispatchEvent(bubbleclick);
      }
    }
  }
  else {
    this.startDriftOut();
  }

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
  this.fov = THREE.MathUtils.clamp(this.fov, MAX_ZOOM, MIN_ZOOM)
  if (this.fov < MAX_ZOOM || this.fov > MIN_ZOOM) {
    this.fov = (this.fov < MAX_ZOOM) ? MAX_ZOOM : MIN_ZOOM;
  }
  // update sphere scales
  this.reticle.scale.setScalar(this.fov / MIN_ZOOM);
  for (var i=0; i<this.bubbles.children.length; i++) {
    this.bubbles.children[i].scale.setScalar(this.fov / MIN_ZOOM);
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
  if (this.movementLog.length < 2) return null;
  var end = this.movementLog.pop();
  var start = this.movementLog.pop();
  this.dlat = end[0] - start[0];
  this.dlon = end[1] - start[1];
  this.movementLog = [];

  if (Math.sqrt(this.dlat * this.dlat + this.dlon * this.dlon) > (window.devicePixelRatio / 4)) {
    this.driftOut();
  }
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

  if (Math.abs(this.dlon) < this.minDrift && Math.abs(this.dlat) < this.minDrift) return;

  this.lat = this.lat + this.dlat;
  this.lon = this.lon + this.dlon;

  this.dlon *= this.driftFriction;
  this.dlat *= this.driftFriction;

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
  this.testClicks();
  this.updateBubbleTransparency();
  this.lat = Math.max(-85, Math.min(85, this.lat));
  this.phi = THREE.MathUtils.degToRad(90 - this.lat);
  this.theta = THREE.MathUtils.degToRad(this.lon);
  this.camera.position.setFromSphericalCoords(100, this.phi, -this.theta);
  this.camera.lookAt(this.scene.position);
  this.renderer.render(this.scene, this.camera);
}

PanoViewer.prototype.updateBubbleTransparency = function() {
  var fov = (this.fov / 180) * Math.PI;
  var stayin = Math.PI / 6;
  var fadein = Math.max(fov / 2 - stayin, Math.PI / 16);
  for (var i=0; i<this.bubbles.children.length; i++) {
    var bubble = this.bubbles.children[i];
    var between = Math.PI - this.camera.position.angleTo(bubble.position);
    var opacity = 1 - (between - stayin) / fadein;
    var clamped_opacity = THREE.MathUtils.clamp(opacity, .1, 1);
    bubble.material.opacity = clamped_opacity;
  }
}

PanoViewer.prototype.testClicks = function() {}

PanoViewer.prototype.enableDebug = function() {

  PanoViewer.prototype.showMousePos = function(event) {
    this.coordsElement.innerText = event.clientX + "," + event.clientY;
  }

  // Debug mouse position
  this.interactionEvents.push(this.bindEvent(this.canvas, 'mousemove', this.showMousePos));

  this.coordsElement = document.createElement('div');
  this.coordsElement.style.position = 'absolute';
  this.coordsElement.style.top = 0;
  this.coordsElement.style.left = 0;
  this.element.appendChild(this.coordsElement);
}

// Auto-init .pano-viewer[data-src] elements.

var viewers = [];
var viewer_elements = document.getElementsByClassName('pano-viewer');
for (var i=0; i<viewer_elements.length; i++) {
  var src = viewer_elements[i].getAttribute('data-src');
  if (src) {
    viewers.push(new PanoViewer(viewer_elements[i], src));
  }
}
