/*global define */
define(['jquery', 'model-viewer', 'model-downloader', 'model-loader'], function($, ModelViewer, ModelDownloader, modelLoader) {
    'use strict';

    if (!ModelViewer.supportsWebGL) {
        $('.progress').html('<a href="http://get.webgl.org/">No WebGL support :(</a>');
        return;
    }

    // Initialize the model viewer
    var stage = $('.model-viewer .stage');
    ModelViewer.init(stage.get(0)
    	// ,{keysMap: {left: 81, right: 68, forward: 90, back: 83, up: 32, down: 17}} // Keyboard AZERTY
    );

    modelLoader.get('models/epia.zip');

});
