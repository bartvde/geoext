/**
 * Copyright (c) 2008-2012 The Open Source Geospatial Foundation
 *
 * Published under the BSD license.
 * See http://svn.geoext.org/core/trunk/geoext/license.txt for the full text
 * of the license.
 */

/** api: example[legendpanel]
 *  Legend Panel
 *  ------------
 *  Display a layer legend in a panel.
 */

Ext.ns('GisArts');

GeoExt.LegendImage.prototype.onImageLoad = function() {
    var el = this.getEl();
    if (el.getHeight() == 5) {
        this.fireEvent("empty", this);
    } else {
        this.fireEvent("notempty", this);
    }
    if (!OpenLayers.Util.isEquivalentUrl(el.dom.src, this.defaultImgSrc)) {
        el.removeClass(this.noImgCls);
    }
};

// for GeoExt version 1.1
GeoExt.LegendImage.prototype.setUrl = function(url) {
    this.url = url;
    var el = this.getEl();
    if (el) {
        el.un("load", this.onImageLoad, this);
        el.on("load", this.onImageLoad, this, {single: true});
        el.un("error", this.onImageLoadError, this);
        el.on("error", this.onImageLoadError, this, {single: true});
        el.dom.src = url;
    }
};

GeoExt.LegendPanel.prototype.onRender = function() {
    GeoExt.LegendPanel.superclass.onRender.apply(this, arguments);
    if(!this.layerStore) {
        this.layerStore = GeoExt.MapPanel.guess().layers;
    }
    if (this.legendLayers) {
        for (var i=this.legendLayers.length; i >= 0; --i) {
            var title = this.legendLayers[i];
            var recordIndex = this.layerStore.findBy(function(rec, id) {
                return (rec.getLayer().name === title);
            });
            if (recordIndex > -1) {
                this.addLegend(this.layerStore.getAt(recordIndex));
            }
        }
    } else {
        this.layerStore.each(function(record) {
            this.addLegend(record);
        }, this);
    }
};

GisArts.WMSLegend = Ext.extend(GeoExt.WMSLegend, {
    onLayerMoveend: function() {
        this.update();
    },
    update: function() {
        var layer = this.layerRecord.getLayer();
        // In some cases, this update function is called on a layer
        // that has just been removed, see ticket #238.
        // The following check bypass the update if map is not set.
        if(!(layer && layer.map)) {
            return;
        }
        GeoExt.WMSLegend.superclass.update.apply(this, arguments);

        var textCmp = this.items.find(function(item){
            return item.isXType('label');
        });
        var found = false;
        this.items.each(function(cmp) {
            if(cmp !== textCmp) {
                found = true;
                cmp.setUrl(this.getLegendUrl());
            }
        }, this);
        if (found === false) {
            this.add({
                xtype: this.itemXType,
                listeners: {
                    'empty': function() {
                        textCmp._hide = true;
                        textCmp.hide();
                    },
                    'notempty': function() {
                        if (textCmp._hide === true) {
                            textCmp.show();
                            delete textCmp._hide;
                        }
                    }
                },
                url: this.getLegendUrl()
            });
        }
        this.doLayout();
    },
    getLegendUrl: function() {
        var rec = this.layerRecord;
        var layer = rec.getLayer();
        var url;
        if (layer.map && layer.map.getExtent() !== null) {
            var bounds = layer.map.getExtent();
            bounds = layer.adjustBounds(bounds);
            var imageSize = layer.getImageSize(bounds);
            var newParams = {};
            // WMS 1.3 introduced axis order
            var reverseAxisOrder = layer.reverseAxisOrder();
            newParams.BBOX = layer.encodeBBOX ?
                bounds.toBBOX(null, reverseAxisOrder) :
                bounds.toArray(reverseAxisOrder);
            newParams.WIDTH = imageSize.w;
            newParams.HEIGHT = imageSize.h;
            newParams.REQUEST = 'GetLegendGraphic';
            if (layer.legendLayers) {
                var layers = [];
                for (var i=layer.legendLayers.length-1; i >= 0; i--) {
                    if (layer.params.LAYERS.indexOf(layer.legendLayers[i]) >= 0) {
                        layers.push(layer.legendLayers[i]);
                    }
                }
                newParams.LAYERS = layers;
            }
            url = layer.getFullRequestString(newParams);
        }
        return url;
    }
});

GisArts.WMSLegend.supports = function(layerRecord) {
    return layerRecord.getLayer() instanceof OpenLayers.Layer.WMS ? 1 : 0;
};

/** api: legendtype = gisarts_wmslegend */
GeoExt.LayerLegend.types["gisarts_wmslegend"] = GisArts.WMSLegend;

Ext.reg('gisarts_wmslegend', GisArts.WMSLegend);

var mapPanel, legendPanel;

Ext.onReady(function() {
    var map = new OpenLayers.Map({projection: "EPSG:28992", maxExtent: new OpenLayers.Bounds(175000, 400000, 194000, 422000), units: 'm', scales: [10000001, 5000001, 2000001, 1500001, 1000001, 750001, 500001, 375001, 250001, 100001, 50001, 25001, 10001, 5001, 2501, 1001, 501, 251, 101, 1], allOverlays: true});
    map.addLayers([
        new OpenLayers.Layer.WMS(
            "BGT",
            "https://www.cgmgis.nl/cgi-bin/mapserv?",
            {layers: ["bgt_buitengebied", "bgt_wegdeel", "bgt_ondersteunendwegdeel", "bgt_weginrichtingselement", "bgt_begroeidterreindeel", "bgt_vegetatieobject", "bgt_functioneelgebied", "bgt_onbegroeidterreindeel", "bgt_waterdeel", "bgt_ondersteunendwaterdeel", "bgt_overbruggingsdeel", "bgt_scheiding", "bgt_overschrijding", "bgt_onbekendmeten", "bgt_data", "bgt_reconstructie"], format: "image/gif", map: "/home/gisarts/apps/gisportalen/cgmgis/map/authenticatie/basis.map"},
            {singleTile: true, /* top to bottom */ legendLayers: ["bgt_reconstructie", "bgt_overbruggingsdeel", "bgt_wegdeel"]}),
        new OpenLayers.Layer.WMS(
            "Topografie",
            "https://www.cgmgis.nl/cgi-bin/mapserv?",
            {layers: ["gbkn_straatnamen", "gbkn_topografie"], transparent: true, format: "image/gif", map: "/home/gisarts/apps/gisportalen/cgmgis/map/authenticatie/basis.map"},
            {singleTile: true, minScale: 2500, maxScale: 0}
        ),
        new OpenLayers.Layer.WMS(
            "Kadastrale informatie",
            "https://www.cgmgis.nl/cgi-bin/mapserv?",
            {layers: ["lki_gemeentegrens", "lki_percelen", "lki_perceelnr", "lki_gemeentegrens"], transparent: true, format: "image/gif", map: "/home/gisarts/apps/gisportalen/cgmgis/map/authenticatie/basis.map"},
            {singleTile: true}
        )
    ]);
    map.addControl(new OpenLayers.Control.LayerSwitcher());

    mapPanel = new GeoExt.MapPanel({
        region: 'center',
        height: 400,
        width: 600,
        map: map,
        center: new OpenLayers.LonLat(187810.65642, 416570.47872),
        zoom: 14
    });

    legendPanel = new GeoExt.LegendPanel({
        defaults: {
            labelCls: 'mylabel',
            style: 'padding:5px'
        },
        preferredTypes: ['gisarts_wmslegend'],
        cls: "legendpanel",
        /* top to bottom */
        legendLayers: ["BGT", "Topografie", "Kadastrale informatie"],
        bodyStyle: 'padding:5px',
        width: 350,
        autoScroll: true,
        region: 'west'
    });

    new Ext.Panel({
        title: "GeoExt LegendPanel Demo",
        layout: 'border',
        renderTo: 'view',
        height: 400,
        width: 800,
        items: [legendPanel, mapPanel]
    });
});
