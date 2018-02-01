var defaultStyle = {};

// Define a layer collection for easy styling
var mapLayerCollection = {
    'water': ['water', 'waterway-river-canal', 'waterway-small'],
    'road-bridges': ['bridge-main', 'bridge-street', 'bridge-trunk', 'bridge-motorway'],
    'buildings': ['building'],
    'road-subways': ['tunnel-motorway', 'tunnel-trunk', 'tunnel-main', 'tunnel-street'],
    'road': [
        'road-main',
        'road-construction',
        'road-rail',
        'road-motorway',
        'road-trunk',
        'road-street',
        'road-service-driveway',
        'road-path',
        'tunnel-motorway',
        'tunnel-trunk',
        'tunnel-main',
        'tunnel-street',
        'bridge-main',
        'bridge-street',
        'bridge-trunk',
        'bridge-motorway',
        'road-street_limited',
        'aeroway-runway',
        'aeroway-taxiway',
        'road-rail',
        'bridge-rail'
    ]
};

// Highlight a layer collection
function mapHighlight(item) {

  var collectionName = $(item).attr('data-map-layer');
  var color = $(item).attr('data-map-layer-highlight');

  // Loop through collection and store defaults before changing them
  for (var i = 0; i < mapLayerCollection[collectionName].length; i++) {

    var obj = mapLayerCollection[collectionName][i];

    // Choose an appropriate property to change
    if (map.getLayer(obj).type == 'raster')
      prop = 'raster-opacity';
    if (map.getLayer(obj).type == 'fill')
      prop = 'fill-color';
    if (map.getLayer(obj).type == 'line')
      prop = 'line-color';
    if (map.getLayer(obj).type == 'circle')
      prop = 'circle-color';

    var propObj = {};
    propObj[prop] = map.getPaintProperty(obj, prop);

    defaultStyle[obj] = propObj;
    map.setPaintProperty(obj, prop, color);

  }

}

// Reset style of a collection to default
function mapHighlightReset() {

  for (var collectionName in mapLayerCollection) {
    // Loop through collection and and reset properties to stored defaults
    for (var i = 0; i < mapLayerCollection[collectionName].length; i++) {

      var obj = mapLayerCollection[collectionName][i];
      var prop;

      // Choose an appropriate property to change
      if (map.getLayer(obj).type == 'fill')
        prop = 'fill-color';
      if (map.getLayer(obj).type == 'line')
        prop = 'line-color';
      if (map.getLayer(obj).type == 'circle')
        prop = 'circle-color';

      // Revert to default style if known
      try{
      if (defaultStyle[obj][prop])
        map.setPaintProperty(obj, prop, defaultStyle[obj][prop]);
      }
      catch(e){}

    }
  }

}

// Toggle visibility of a layer collection using opacity
function mapToggle(item) {

  var collectionName = $(item).attr('data-map-layer');

  // Loop through collection and toggle visibility
  for (var i = 0; i < mapLayerCollection[collectionName].length; i++) {

    var obj = mapLayerCollection[collectionName][i];
    var prop;

    // Choose an appropriate property to change
    if (map.getLayer(obj).type == 'raster')
      prop = 'raster-opacity';
    if (map.getLayer(obj).type == 'fill')
      prop = 'fill-opacity';
    if (map.getLayer(obj).type == 'line')
      prop = 'line-opacity';
    if (map.getLayer(obj).type == 'circle')
      prop = 'circle-opacity';
    try {
      map.setPaintProperty(obj, prop, !map.getPaintProperty(obj, prop));
    } catch (e) {
      map.setPaintProperty(obj, prop, 0);
    }

  }
}

function runSetup(map, LOCALE) {
  map.setPitch(LOCALE.pitch);
  map.flyTo(LOCALE);
  //Supress Tile errors
  map.off('tile.error', map.onError);

  // Add zoom and rotation controls to the map.
  map.addControl(new mapboxgl.Navigation());
}

function runInteraction(map, DATASETS_BASE, datasetsAccessToken) {
  map.on('style.load', function (e) {

      var selectedRoadsSource = new mapboxgl.GeoJSONSource({});

      map.addSource('selected-roads', selectedRoadsSource);
      map.addLayer({
          'id': 'selected-roads',
          'type': 'line',
          'source': 'selected-roads',
          'interactive': true,
          'paint': {
              'line-color': 'rgba(199,16,181,1)',
              'line-width': 3,
              'line-opacity': 0.6
          }
      }, 'road-waterlogged');

    // Select flooded roads
      var featuresGeoJSON = {
          'type': 'FeatureCollection',
          'features': []
      };
      $('#feature-count').toggleClass('loading');
      function getFeatures(startID) {
          var url = DATASETS_BASE + 'features';
          var params = {
              'access_token': datasetsAccessToken
          };
          if (startID) {
              params.start = startID;
          }
          $.getJSON(url, params, function (data) {
              if (data.features.length > 0) {
                  data.features.forEach(function (feature) {
                      feature.properties.id = feature.id;
                  });
                  featuresGeoJSON.features = featuresGeoJSON.features.concat(data.features);
                  var lastFeatureID = data.features[data.features.length - 1].id;
                  getFeatures(lastFeatureID);
                  selectedRoadsSource.setData(featuresGeoJSON);
              } else {
                playWithMap(featuresGeoJSON);
              }
          });
      }

      getFeatures(null);

    // Update map legend from styles
    $('[data-map-layer]').each(function () {
        // Get the color of the feature from the map
        var obj = $(this).attr('data-map-layer');

        try {
            var color = map.getPaintProperty(obj, 'circle-color');
            // Set the legend color
            $(this).prepend('<div class="map-legend-circle" style="background:"' + array2rgb(color) + '></div>');
        } catch (e) {
            return;
        }
    });

      function playWithMap(data) {
          var addedRoads = [];
          var addedFeatures = [];

          //Dump Data
          window.dump = JSON.stringify(data);

          for (var i = 0; i < data.features.length; i++) {
              addedRoads.push(data.features[i].properties.id);
              addedFeatures.push(data.features[i]);
          }


          map.on('click', function (e) {
              if (map.getZoom() >= 13.9) {
                  //Check if the feature clicked on is in the selected Roads Layer.
                  //If yes, UNSELECT the road
                  map.featuresAt(e.point, {radius: 5, includeGeometry: true, layer: 'selected-roads'}, function (err, features) {
                      if (err) throw err;

                      if (features.length > 0) {

                          $('#map').toggleClass('loading');
                          var saveURL = DATASETS_BASE + 'features/' + features[0].properties.id + '?access_token=' + datasetsAccessToken;

                          var index = addedRoads.indexOf(features[0].properties.id);
                          $.ajax({
                              'method': 'DELETE',
                              'url': saveURL,
                              'contentType': 'application/json',
                              'success': function () {
                                  $('#map').toggleClass('loading');
                                  data['features'].splice(index, 1);
                                  addedRoads.splice(index, 1);
                                  addedFeatures.splice(index, 1);
                                  selectedRoadsSource.setData(data);
                              },
                              'error': function () {
                                  $('#map').toggleClass('loading');
                              }
                          });
                      } else {
                          //If road is not present in the `selected-roads` layer,
                          //check the glFeatures layer to see if the road is present.
                          //If yes,ADD it to the `selected-roads` layer
                          map.featuresAt(e.point, {radius: 5, includeGeometry: true, layer: mapLayerCollection['road']}, function (err, glFeatures) {
                              if (err) throw err;

                              var tempObj = {
                                  'type': 'Feature'
                              };

                              tempObj.geometry = glFeatures[0].geometry;
                              tempObj.properties = glFeatures[0].properties;
                              tempObj.properties['is_flooded'] = true;
                              tempObj.properties['timestamp'] = (new Date()).toJSON();

                              $('#map').toggleClass('loading');

                              var id = md5(JSON.stringify(tempObj));
                              tempObj.id = id;
                              var saveURL = DATASETS_BASE + 'features/' + id + '?access_token=' + datasetsAccessToken;

                              $.ajax({
                                  'method': 'PUT',
                                  'url': saveURL,
                                  'data': JSON.stringify(tempObj),
                                  'dataType': 'json',
                                  'contentType': 'application/json',
                                  'success': function (response) {
                                      $('#map').toggleClass('loading');
                                      tempObj.id = response.id;
                                      tempObj.properties.id = response.id;
                                      addedFeatures.push(tempObj);
                                      data.features.push(tempObj);
                                      addedRoads.push(glFeatures[0].properties.osm_id);
                                      selectedRoadsSource.setData(data);
                                  },
                                  'error': function () {
                                      $('#map').toggleClass('loading');
                                  }
                              });
                          });
                      }
                  });
              }
          });
      }
  });
}

function array2rgb(color) {
    // Combine and return the values
    return 'rgba(' + color.map(function (x) {
        return x * 255;
    }).join() + ')';
}
