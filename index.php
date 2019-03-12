<!DOCTYPE html>
<html>
    <head>
        <title>ThreeJS 360 Panorama</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
        <style>
            .sr-only {
                position: absolute;
                height: 0;
                width: 0;
                left: -10000px;
            }
            html{
                margin: 0;
                padding: 0;
                text-align: center;
            }
            body {
                font-size: 18px;
                line-height: 1.5em;
                position: relative;
                margin: 0;
                width: 100%;
                height: 100%;
                padding: 0;
                display: inline-block;
                max-width: 1440px;
                overflow-x: hidden;
            }
            a{
                color: #528CE0;
            }
            #demo{
                /* comment for fixed dimentsions */
                position: relative;
                height: 650px;
                margin: 0 auto;
                overflow: hidden;
                cursor: move; /* fallback if grab cursor is unsupported */
                cursor: grab;
                cursor: -moz-grab;
                cursor: -webkit-grab;
            }
            #demo:active {
                cursor: grabbing;
                cursor: -moz-grabbing;
                cursor: -webkit-grabbing;
            }
            #log{
                position: absolute;
                background: #fff;
                padding: 20px;
                bottom: 20px;
                left: 20px;
                width: 150px;
                font: normal 12px/18px Monospace, Arial, Helvetical, sans-serif;
                text-align: left;
                border: 3px double #ddd;
            }
            #description{
                display: inline-block;
                width: 100%;
                max-width: 600px;
                text-align: left;
            }
            .pano-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                font-size: 2em;
                font-weight: lighter;
                background-color: rgba(0,0,0,0.2);
                border: 0;
                color: #fff;
            }
            .pano-overlay.interacting {
                top: 0;
                left: auto;
                right: 0;
                width: auto;
                height: auto;
                padding: 1em;
                font-size: 1em;
            }
        </style>
    </head>
    <body>
        <h1>A panoramic experiment with Three.JS</h1>
        <div id="demo"></div>

        <p>Hac ex nascetur purus tristique massa auctor ultrices auctor metus consectetur. Porttitor Ut imperdiet bibendum ad metus adipiscing Curae risus Pellentesque placerat vel. Urna Curae lacus Curabitur diam himenaeos montes Interdum sagittis taciti Pellentesque. Eget leo nec est elit montes Praesent Nullam. )nteger mus fames penatibus risus vestibulum Maecenas finibus risus turpis eu natoque Cras tellus.</p>

        <p>Natoque ornare efficitur Vivamus tempus Morbi dignissim ligula sociosqu. Fames Suspendisse tellus eget natoque porta urna habitant natoque semper. Vehicula eleifend fringilla fermentum vestibulum hac elementum mus tempus lectus netus aliquet sed vitae egestas mus hendrerit Suspendisse In magna. Inceptos odio Vivamus fringilla convallis Integer laoreet. -orbi Interdum Orci In Proin a gravida Vestibulum Integer ultricies metus tempor ultricies platea.</p>

        <p>Sagittis Mauris magnis Donec mollis metus cursus odio nibh aliquam viverra vitae justo. Pellentesque tellus torquent Etiam leo aptent dolor ullamcorper eleifend ex semper. /rci efficitur dictumst sodales sed rutrum orci amet ad vitae sapien mi luctus.</p>

        <!--    Load three.js from CDN
                <script src="http://threejs.org/build/three.min.js"></script>
                or, for reliability of this demo just use the local copy -->

        <script src="libs/threejs/build/three.min.js"></script>
        <!-- <script src="https://threejs.org/build/three.js"></script> -->
        <!-- <script src="js/main.js?v=<?= rand() ?>"></script> -->
        <script src="js/main.js"></script>
    </body>
</html>
