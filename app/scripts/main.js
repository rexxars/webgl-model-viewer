/*global require */
require.config({
    paths: {
        jquery: '../components/jquery/jquery',
        jszip: '../components/jszip/jszip.min',
        lodash: '../components/lodash/dist/lodash.compat'
    }
});

require(['app', 'jquery'], function(app, $) {
    'use strict';
});