const LOCALE = {
  'center': [-94.8, 29.3],
  'zoom': 14,
  'pitch': 0,
  'bearing': 0
};
const BOUNDS = [
  [-94.65, 29.45],
  [-95.25,  28.05]
];
const map = new mapboxgl.Map({
  container: 'map',
  style: STYLE,
  hash: true,
  maxBounds: BOUNDS
});

runSetup(map, LOCALE);
runInteraction(map, DATASETS_BASE, datasetsAccessToken);
