<!DOCTYPE html>
<html>
    <head>
        <title>ThreeJS 360 Panorama</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
        <style>
            html{
                margin: 0;
                padding: 0;      
                text-align: center;
            }
            body {
                font-size: 18px;
                line-height: 1.5em;
                position: relative;
                width: 100%;
                height: 100%;
                margin: 40px auto;
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
        </style>
    </head>
    <body>
        <h1>A panoramic experiment with Three.JS</h1>
        <div id="demo">
        </div>

        <!--    Load three.js from CDN
                <script src="http://threejs.org/build/three.min.js"></script>
                or, for reliability of this demo just use the local copy -->

        <script src="libs/threejs/build/three.min.js"></script>        
        <!-- <script src="js/main.js?v=<?= rand() ?>"></script>         -->
        <script src="js/main.js"></script>        
    </body>
</html>
