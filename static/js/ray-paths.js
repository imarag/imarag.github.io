var data = [{
    type: 'scattermapbox',
    lat: [40.7128, 34.0522, 51.5074], // Latitude coordinates
    lon: [-74.0060, -118.2437, -0.1278], // Longitude coordinates
    mode: 'markers',
    marker: {
      size: 10,
      color: 'blue'
    },
    text: ['New York', 'Los Angeles', 'London']
  }];
  
  // Specify the layout options
  var layout = {
    mapbox: {
    style: 'mapbox://styles/mapbox/streets-v11',
      center: { lat: 40, lon: -100 }, // Initial center position of the map
      zoom: 3 // Initial zoom level
    },
    width: 800, // Width of the map container
    height: 600 // Height of the map container
  };
  
  // Create the plot
  Plotly.newPlot('map', data, layout);