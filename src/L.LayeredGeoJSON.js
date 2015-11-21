'use strict';

L.LayeredGeoJSON = L.GeoJSON.extend({
	options:{
		boundsPadding: 25,
		queryOnMapAdd:true,
		queryOnMapZoom:true,
		queryOnMapDrag:true,
		queryFn: function(){}
	},
	initialize: function (geojson, options) {
		L.GeoJSON.prototype.initialize.call(this, geojson, options);
		this._last = null;
		this._lastZoom = 0;
		this._queryFn = options.queryFn || this.options.queryFn;
		this._boundsPadding = options.boundsPadding || this.options.boundsPadding;
	},

	onAdd: function (map) {
		var that = this;
		var query = function(){
			that.queryData();
		};

		L.GeoJSON.prototype.onAdd.call(this, map);

		if(this.options.queryOnMapAdd){
			this.queryData();
		}

		if(this.options.queryOnMapZoom){
			this._map.on('zoomend', query);
		}

		if(this.options.queryOnMapDrag){
			this._map.on('dragend', query);
		}

	},

	onRemove: function (map) {
		this._map.off('zoomend', query);
		this._map.off('dragend', query);
		
		L.GeoJSON.prototype.onRemove.call(this, map);
	},

	addData: function (geojson) {
		var that = this;
		Object.keys(this._layers).forEach(function(prop){
			that._layers[prop].clearLayers();
			that._layers[prop].addData(geojson);
	  });
	},

	addLayer: function (layer) {
		if(this.options.onEachFeature){
			if(!layer.options.onEachFeature){
				layer.options.onEachFeature = this.options.onEachFeature;
			}else{
				// eval is ok here as its in the same scope
				var originalOnEachFeature = eval(layer.options.onEachFeature); // jshint ignore:line
				var that = this;
				layer.options.onEachFeature = function(feature, layer){
					originalOnEachFeature(feature, layer);
					that.options.onEachFeature(feature, layer);
				};
			}
		}

		L.GeoJSON.prototype.addLayer.call(this, layer);
		return this;
	},

  	queryData: function(){
  		var that = this;
  		if(this._map){
			if(!this._last || !this._last.contains(this._map.getBounds()) || Math.abs(this._map.getZoom() - this._lastZoom) > 1){
				var bbox = this._map.getBounds().pad(this._boundsPadding);
				var longDiff = Math.abs(bbox._southWest.lng - bbox._northEast.lng);
	  			var latDiff = Math.abs(bbox._northEast.lat - bbox._southWest.lat);
				
				var query = [
				  bbox._southWest.lng - longDiff,
				  bbox._northEast.lat + latDiff,  
				  bbox._northEast.lng + longDiff,
				  bbox._southWest.lat - latDiff
				];

				this._queryFn({
					bbox: query.join(',')
				}, function(features){
					that.addData(features);
					that._last = bbox;
					that._lastZoom = that._map.getZoom();
					that.fire('refreshed');
				});
			}
  		}
	},

	invalidateCache: function(){
		//If we add a cache, invalidate it here
		this._last = null;
		this._lastZoom = 0;
	},
	refresh: function(){
		this.invalidateCache();
		this.queryData();
	}
});

module.exports = L.GroupedGeoJSON;