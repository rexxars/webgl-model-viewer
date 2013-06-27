/*global define */
define(['require', 'jquery', 'model-viewer', 'model-downloader', 'lodash'], function(require, $, ModelViewer, ModelDownloader, _) {

    'use strict';

    // Load the initial model with a progress indicator
    var progress    = $('.progress')
      , progressBar = progress.find('.bar')
      , loader      = new ModelDownloader({

        onProgress: function(current, total) {
            progressBar.css('width', ((current / total) * 100) + '%');
        },

        onError: function(e) {
            console.log(e);
        },

        onReadStart: function() {
            progress.removeClass('gone');
        },

        onSuccess: function(modelDoc, b) {
            _.delay(function() {
                progress.addClass('gone');
            }, 350);

            ModelViewer = require('model-viewer');
            ModelViewer.parseColladaDoc(modelDoc, function(model) {
                ModelViewer.positionCamera(-7.012865984806965, 4.904537173175244, -7.452066400217873 );
                ModelViewer.addModel(model.scene);
            }, 'models/');
        }

    });

    return loader;

});