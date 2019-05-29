# PanoViewer

PanoViewer is a simple 360 image viewer built on THREE js, building on the work of (https://github.com/ NorikDavtian/ThreeJS-360-Panorama)[NorikDavtian/ThreeJS-360-Panorama].

## Usage

PanoViewer will auto initialize `.pano-viewer[data-src]` elements.

```html
<div class="pano-viewer" data-src="...image url..."></div>
```

You can also manualy initialize an element.

```javascript
var element = document.getElementById('pano-example');
var pano_example = new PanoViewer(element, '...image url...');
```

