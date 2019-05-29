<!DOCTYPE html>
<html>
    <head>
        <title>ThreeJS 360 Panorama</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <body>
        <h1>A panoramic experiment with Three.JS</h1>
        <div class="pano-viewer" data-src="img/warrior-row-c-compressed.jpg"></div>

        <script src="libs/threejs/build/three-r104.min.js"></script>
        <!-- <script src="https://threejs.org/build/three.js"></script> -->
        <?php
        // echo '<script src="js/main.js?v=' . rand() . '"></script>';
        echo '<script src="js/main.js"></script>';
        ?>
    </body>
</html>