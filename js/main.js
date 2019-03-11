"use strict";
function PanoViewer(element, textureUrl) {
    this.camera,
    this.scene,
    this.element = element, // Inject this.scene into this
    this.renderer,
    this.onPointerDownPointerX,
    this.onPointerDownPointerY,
    this.onPointerDownLon,
    this.onPointerDownLat,
    this.fov = 70, // Field of View
    this.isUserInteracting = false,
    this.lon = 0,
    this.lat = 0,
    this.phi = 0,
    this.theta = 0,
    this.onMouseDownMouseX = 0,
    this.onMouseDownMouseY = 0,
    this.width = 650, // int || window.innerWidth
    this.height = 650, // int || window.innerHeight
    this.ratio = this.width / this.height;
    var _this = this;
    this.texture = THREE.ImageUtils.loadTexture(textureUrl, new THREE.UVMapping(), function() {
        _this.init();
        _this.animate();
    });
}
PanoViewer.prototype.bindEvent = function(target, event, callback) {
    var _this = this;
    var boundCallback = function(event) {
        callback.apply(_this, [event]);
    }
    target.addEventListener(event, boundCallback);
    target['bound' + event] = boundCallback;
}
PanoViewer.prototype.unbindEvent = function(target, event) {
    var key = 'bound' + event;
    if (key in target) {
        target.removeEventListener(event, target[key]);
        delete target[key];
    }
}
PanoViewer.prototype.init = function() {
    this.camera = new THREE.PerspectiveCamera(this.fov, this.ratio, 1, 1000);
    this.scene = new THREE.Scene();
    var mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 60, 40), new THREE.MeshBasicMaterial({map: this.texture}));
    mesh.scale.x = -1;
    this.scene.add(mesh);
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setSize(this.width, this.height);
    this.element.appendChild(this.renderer.domElement);
    this.bindEvent(this.element, 'mousedown', this.onDocumentMouseDown);
    this.bindEvent(this.element, 'touchstart', this.onDocumentMouseDown);
    this.bindEvent(this.element, 'mousewheel', this.onDocumentMouseWheel);
    this.bindEvent(this.element, 'DOMMouseScroll', this.onDocumentMouseWheel);
    this.bindEvent(window, 'resize', this.onWindowResized);
    this.onWindowResized(null);
}
PanoViewer.prototype.getInteractionEventObject = function(event) {
    if ('touches' in event) {
        return event.touches.length > 1
        ? null
        : event.touches[0];
    }
    return event;
}
PanoViewer.prototype.onWindowResized = function(event) {
    this.ratio = window.innerWidth / window.innerHeight;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.projectionMatrix.makePerspective(this.fov, window.innerWidth / window.innerHeight, 1, 1100);
    // this.renderer.setSize(this.width, this.height);
    // this.camera.projectionMatrix.makePerspective(this.fov, this.ratio, 1, 1100);
}
PanoViewer.prototype.onDocumentMouseDown = function(event) {
    event.preventDefault();
    var interaction = this.getInteractionEventObject(event);
    if (interaction == null) return;
    this.onPointerDownPointerX = interaction.clientX;
    this.onPointerDownPointerY = interaction.clientY;
    this.onPointerDownLon = this.lon;
    this.onPointerDownLat = this.lat;
    this.isUserInteracting = true;
    this.bindEvent(this.element, 'mousemove', this.onDocumentMouseMove);
    this.bindEvent(this.element, 'touchmove', this.onDocumentMouseMove);
    this.bindEvent(this.element, 'mouseup', this.onDocumentMouseUp);
    this.bindEvent(this.element, 'touchend', this.onDocumentMouseUp);
}
PanoViewer.prototype.onDocumentMouseMove = function(event) {
    var interaction = this.getInteractionEventObject(event);
    if (interaction == null) return;
    this.lon = (interaction.clientX - this.onPointerDownPointerX) * -0.175 + this.onPointerDownLon;
    this.lat = (interaction.clientY - this.onPointerDownPointerY) * -0.175 + this.onPointerDownLat;
}
PanoViewer.prototype.onDocumentMouseUp = function(event) {
    this.unbindEvent(this.element, 'mousemove');
    this.unbindEvent(this.element, 'touchmove');
    this.unbindEvent(this.element, 'mouseup');
    this.unbindEvent(this.element, 'touchend');
}
PanoViewer.prototype.onDocumentMouseWheel = function(event) {
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
    if (this.fov < 4 || this.fov > 90) {
        this.fov = (this.fov < 4) ? 4 : 90;
    }
    this.camera.projectionMatrix.makePerspective(this.fov, this.ratio, 1, 1100);
}
PanoViewer.prototype.animate = function() {
    var _this = this;
    requestAnimationFrame(function() {
        _this.animate();
    });
    this.render();
}
PanoViewer.prototype.render = function() {
    if (this.isUserInteracting === false) {
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

new PanoViewer(document.getElementById('demo'), 'img/warrior-row-c-compressed.jpg');
// new PanoViewer(document.getElementById('demo'), 'img/pierson.jpg');
