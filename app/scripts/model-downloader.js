/*global define */
define(['lodash', 'zip/zip'], function(_, Zip) {
    'use strict';

    var ModelDownloader = function(options) {
        this.init(options || {});
    };

    _.extend(ModelDownloader.prototype, {

        init: function(options) {
            this.onProgress  = options.onProgress;
            this.onSuccess   = options.onSuccess;
            this.onError     = options.onError;
            this.onReadStart = options.onReadStart;

            this.textures = [];
            this.texturesLoaded = 0;
        },

        get: function(url) {
            if (_.contains(url, '.zip')) {
                return this.getZip(url);
            }

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onprogress = _.bind(function(e) {
                if (!e.lengthComputable) {
                    return;
                }

                this.onProgress(e.loaded, e.total);
            }, this);
            xhr.onreadystatechange = _.bind(function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    return this.onSuccess(xhr.responseText);
                } else if (xhr.readyState === 4) {
                    return this.onError(xhr.status);
                }
            }, this);
            xhr.send();
        },

        getLocalZip: function(file) {
            this.reader = Zip.createReader(
                new Zip.BlobReader(file),
                _.bind(this.onDownloadFinished, this),
                this.onError
            );
        },

        getZip: function(url) {
            this.reader = Zip.createReader(
                new Zip.HttpReader(url),
                _.bind(this.onDownloadFinished, this),
                this.onError
            );
        },

        onDownloadFinished: function(zip) {
            zip.getEntries(_.bind(this.onEntriesRead, this));
        },

        onEntriesRead: function(entries) {
            this.zipEntries = entries;

            for (var key in entries) {
                if (entries[key].filename.match(/\.dae$/)) {
                    return this.readModelEntry(entries[key]);
                }
            }

            alert('No DAE file found in ZIP');
        },

        findZipEntry: function(filename) {
            for (var key in this.zipEntries) {
                if (this.zipEntries[key].filename === filename) {
                    return this.zipEntries[key];
                }
            }

            return false;
        },

        readModelEntry: function(entry) {
            if (this.onReadStart) {
                this.onReadStart();
            }

            entry.getData(
                new Zip.TextWriter(),
                _.bind(this.onModelXmlRead, this),
                this.onProgress ? _.throttle(this.onProgress, 75) : null
            );
        },

        onModelXmlRead: function(xml) {
            var xmlParser = new DOMParser();
            this.modelDoc = xmlParser.parseFromString(xml, 'application/xml');
            this.queryForTextures(this.modelDoc);
        },

        queryForTextures: function(doc) {
            var q = '//dae:library_images/dae:image';
            var elements = doc.evaluate(q, doc, this.resolveNS, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
            var element = elements.iterateNext(), i, child, entry;
            var textures = [];

            while (element) {
                for (i = 0; i < element.childNodes.length; i++) {
                    child = element.childNodes[i];
                    if (child.nodeName === 'init_from') {
                        entry = this.findZipEntry(child.textContent);
                        if (entry) {
                            textures.push({ zipEntry: entry, docNode: child });
                        }
                    }
                }

                element = elements.iterateNext();
            }

            this.textures = textures;
            this.texturesLoaded = 0;
            this.loadTextures();
        },

        resolveNS: function(nsPrefix) {
            if (nsPrefix === 'dae') {
                return 'http://www.collada.org/2005/11/COLLADASchema';
            }

            return null;
        },

        resolveMime: function(filename) {
            switch (filename.replace(/.*\.(.*)/, '$1')) {
                case 'png':
                    return 'image/png';
                case 'bmp':
                    return 'image/bmp';
                case 'gif':
                    return 'image/gif';
                case 'jpg':
                case 'jpeg':
                default:
                    return 'image/jpeg';
            }
        },

        loadTextures: function() {
            if (this.textures.length === 0) {
                return this.onSuccess(this.modelDoc);
            }

            _.map(this.textures, _.bind(this.loadTexture, this));
        },

        loadTexture: function(texture) {
            texture.zipEntry.getData(
                new Zip.Data64URIWriter(this.resolveMime(texture.zipEntry.filename)),
                _.bind(this.onTextureLoaded, this, texture)
            );
        },

        onTextureLoaded: function(texture, data) {
            texture.docNode.textContent = data;

            if (++this.texturesLoaded === this.textures.length) {
                return this.onSuccess(this.modelDoc);
            }
        }

    });

    return ModelDownloader;

});