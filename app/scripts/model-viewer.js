/*global define */
define(['jquery', 'lodash', 'model-loader'], function($, _, modelLoader) {
    'use strict';

    var ModelViewer = {

        supportsWebGL: function() {
            try {
                return !!window.WebGLRenderingContext
                    && !!document.createElement('canvas').getContext('experimental-webgl');
            } catch( e ) {
                return false;
            }
        },

        init: function(container, options) {
            if (!this.supportsWebGL) {
                return;
            }

            this.container = container;
            this.renderer  = new THREE.WebGLRenderer();
            this.camera    = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
            this.scene     = new THREE.Scene();
            this.scale     = 1;

            this.renderer.setSize(window.innerWidth, window.innerHeight);
            container.insertBefore(this.renderer.domElement, container.firstChild);

			if (options && options.keysMap)
				this.keysMap = options.keysMap;
			else
				this.keysMap = {left: 65, right: 68, forward: 87, back: 83, up: 32, down: 17};	

			if (options && options.keySpeed != undefined)
				this.keySpeed = options .keySpeed;
			else
				this.keySpeed = 5;
			
			this.keysPress = {left: false, right: false, forward: false, back: false, up: false, down: false};

            this.buildControls();
            this.positionCamera();
            this.buildGrid();
            this.buildLights();
            this.enableStats();
            this.bindEvents();
            this.animate = _.bind(this.animate, this);
            this.animate();
        },

        getLoader: function() {
            var daeLoader = new THREE.ColladaLoader();
            daeLoader.options.convertUpAxis = true;

            return daeLoader;
        },

        buildControls: function() {
            this.controls  = new THREE.OrbitControls(
                this.camera,
                this.container
            );

            this.controls.addEventListener('change', _.bind(this.render, this));
            this.controls.userPanSpeed = 0.15;
            this.controls.maxPolarAngle = Math.PI / 2;
        },

        bindEvents: function() {
            window.addEventListener(
                'resize',
                _.bind(this.onWindowResize, this),
                false
            );

			setInterval(_.bind(this.moveCamera, this), 10);
            window.addEventListener(
                'keydown',
                _.bind(this.onKeydown, this),
                false
            );
            window.addEventListener(
                'keyup',
                _.bind(this.onKeyup, this),
                false
            );

            $('.scale').on('click', _.bind(function(e) {
                var up = e.target.classList.contains('up'), model = this.model;
                this.scale = Math.max(0.001, up ? this.scale + (this.scale * 0.75) : this.scale - (this.scale * 0.25));

                if (model) {
                    model.scale.x = model.scale.y = model.scale.z = this.scale;
                }
            }, this));

            $('.toggle-stats').on('click', _.bind(function() {
                this.drawStats ? this.disableStats() : this.enableStats();
            }, this));

            $('.upload').on('change', _.bind(this.onModelUpload, this));

            var credits  = $('.credits')
              , controls = credits.find('.controls')
              , help     = credits.find('.help');

            $('.model-help').on('click', function() {
                $([controls, help]).toggleClass('hidden');
            });
        },

        onWindowResize: function() {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(window.innerWidth, window.innerHeight);
        },

		onKeydown: function() {

		    switch ( event.keyCode ) {

		        case this.keysMap.forward :
		        	this.keysPress.forward = true;
		        	event.preventDefault();
		            break;
		        case this.keysMap.back :
		            this.keysPress.back = true;
		            event.preventDefault();
		            break;
		        case this.keysMap.left :
		            this.keysPress.left = true;
		            event.preventDefault();
		            break;
		        case this.keysMap.right :
		            this.keysPress.right = true;
		            event.preventDefault();
		            break;
		        case this.keysMap.up :
		        	this.keysPress.up = true;
		        	event.preventDefault();
		        	break;
		        case this.keysMap.down :
		        	this.keysPress.down = true;
		        	event.preventDefault();
		        	break;

		    }
		},
		onKeyup: function() {
		    switch ( event.keyCode ) {

		        case this.keysMap.forward :
		        	this.keysPress.forward = false;
		        	event.preventDefault();
		            break;
		        case this.keysMap.back :
		            this.keysPress.back = false;
		            event.preventDefault();
		            break;
		        case this.keysMap.left :
		            this.keysPress.left = false;
		            event.preventDefault();
		            break;
		        case this.keysMap.right :
		            this.keysPress.right = false;
		            event.preventDefault();
		            break;
		        case this.keysMap.up :
		        	this.keysPress.up = false;
		        	event.preventDefault();
		        	break;
		        case this.keysMap.down :
		        	this.keysPress.down = false;
		        	event.preventDefault();
		        	break;

		    }
		},
		moveCamera: function(vector) {

        	if (this.keysPress.forward)
	            this.controls.pan( new THREE.Vector3( 0, 0, - 1 * this.keySpeed ) );
	        if (this.keysPress.back)
		        this.controls.pan( new THREE.Vector3( 0, 0, 1 * this.keySpeed ) );
	        if (this.keysPress.left)
	            this.controls.pan( new THREE.Vector3( - 1 * this.keySpeed, 0, 0 ) );
	        if (this.keysPress.right)
	            this.controls.pan( new THREE.Vector3( 1 * this.keySpeed, 0, 0 ) );
	        if (this.keysPress.up)
	            this.controls.pan( new THREE.Vector3( 0, 1 * this.keySpeed, 0 ) );
	        if (this.keysPress.down)
	            this.controls.pan( new THREE.Vector3( 0, - 1 * this.keySpeed, 0 ) );
                        
		},

        positionCamera: function(x, y, z) {
            this.camera.position.set(x || -5, y || 10, z || 15);
        },

        buildGrid: function(gridSize, gridStep, gridColor) {
            var size     = gridSize || 14
              , step     = gridStep || 1
              , geometry = new THREE.Geometry()
              , material = new THREE.LineBasicMaterial({
                    color: gridColor || 0x303030
                });

            if (this.grid) {
                this.scene.remove(this.grid);
            }

            for (var i = -size; i <= size; i += step) {
                geometry.vertices.push(new THREE.Vector3(-size, -0.04, i));
                geometry.vertices.push(new THREE.Vector3( size, -0.04, i));

                geometry.vertices.push(new THREE.Vector3(i, -0.04, -size));
                geometry.vertices.push(new THREE.Vector3(i, -0.04,  size));
            }

            this.grid = new THREE.Line(geometry, material, THREE.LinePieces);
            this.scene.add(this.grid);

            return this.grid;
        },

        buildLights: function() {

            // Hemisphere light
            var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
            hemiLight.color.setHSL(0.6, 0.6, 0.3125);
            hemiLight.groundColor.setHSL(0.095, 0.3333333333333333, 0.375);
            hemiLight.position.set(0, 500, 0);
            this.scene.add(hemiLight);

            this.hemiLight = hemiLight;

            // Directional light
            var dirLight = new THREE.DirectionalLight(0xffffff, 1), d = 300;
            dirLight.position.set(-1, 0.75, 1);
            dirLight.position.multiplyScalar(50);
            dirLight.castShadow = true;
            dirLight.shadowMapWidth = dirLight.shadowMapHeight = 1024 * 2;

            dirLight.shadowCameraLeft = -d;
            dirLight.shadowCameraRight = d;
            dirLight.shadowCameraTop = d;
            dirLight.shadowCameraBottom = -d;

            dirLight.shadowCameraFar = 3500;
            dirLight.shadowBias = -0.0001;
            dirLight.shadowDarkness = 0.35;

            this.scene.add(dirLight);

            this.dirLight = dirLight;
        },

        enableStats: function() {
            this.drawStats = true;
            if (this.stats) {
                this.stats.domElement.style.display = 'block';
                return;
            }

            var stats = this.stats = new THREE.Stats();
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.top = '0px';
            stats.domElement.style.right = '0px';
            this.container.appendChild(stats.domElement);
        },

        disableStats: function() {
            this.drawStats = false;
            if (this.stats) {
                this.stats.domElement.style.display = 'none';
            }
        },

        parseColladaXml: function(xml, callback, assetsUrl) {
            this.getLoader().parseText(xml, callback, assetsUrl);
        },

        parseColladaDoc: function(doc, callback) {
            this.getLoader().parseDoc(doc, callback);
        },

        addModel: function(model) {
            if (this.model) {
                this.scene.remove(this.model);
            }

            model.scale.x = model.scale.y = model.scale.z = this.scale || 1;
            model.updateMatrix();
            this.scene.add(model);

            this.model = model;
        },

        animate: function() {
            requestAnimationFrame(this.animate);
            this.render();
            this.controls.update();

            if (this.drawStats) {
                this.stats.update();
            }
        },

        render: function() {
            this.renderer.render(
                this.scene,
                this.camera
            );
        },

        onModelUpload: function(e) {
            var files = e.target.files;
            if (files.length !== 1) {
                return;
            }

            modelLoader.getLocalZip(e.target.files[0]);
        }

    };

    return ModelViewer;
});
