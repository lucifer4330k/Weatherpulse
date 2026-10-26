// Map utility functions
import type { Coordinates, BoundingBox } from '../types';
import type { LayerSpecification } from 'maplibre-gl';

// Type declaration for ImportMeta
declare global {
  interface ImportMetaEnv {
    readonly VITE_MAPTILER_API_KEY?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// State bounds data
export const STATE_BOUNDS: Record<string, { center: Coordinates; minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  'MH': { minLat: 15.6, maxLat: 22.1, minLon: 72.6, maxLon: 80.9, center: { lat: 19.7515, lon: 75.7139 } },
  'KA': { minLat: 11.5, maxLat: 18.5, minLon: 74.0, maxLon: 78.5, center: { lat: 15.3173, lon: 75.7139 } },
  'TN': { minLat: 8.0, maxLat: 13.5, minLon: 76.2, maxLon: 80.3, center: { lat: 11.1271, lon: 78.6569 } },
  'DL': { minLat: 28.4, maxLat: 28.9, minLon: 76.8, maxLon: 77.3, center: { lat: 28.7041, lon: 77.1025 } },
  'GJ': { minLat: 20.1, maxLat: 24.7, minLon: 68.2, maxLon: 74.5, center: { lat: 22.2587, lon: 71.1924 } },
  'RJ': { minLat: 23.0, maxLat: 30.2, minLon: 69.5, maxLon: 78.2, center: { lat: 27.0238, lon: 74.2179 } },
  'UP': { minLat: 23.9, maxLat: 30.4, minLon: 77.0, maxLon: 84.6, center: { lat: 26.8467, lon: 80.9462 } },
  'WB': { minLat: 21.5, maxLat: 27.2, minLon: 85.8, maxLon: 89.8, center: { lat: 22.9868, lon: 87.8550 } },
  'KL': { minLat: 8.2, maxLat: 12.8, minLon: 74.8, maxLon: 77.4, center: { lat: 10.8505, lon: 76.2711 } },
  'AP': { minLat: 12.6, maxLat: 19.9, minLon: 76.8, maxLon: 84.8, center: { lat: 15.9129, lon: 79.7400 } },
  'TS': { minLat: 15.8, maxLat: 19.9, minLon: 77.2, maxLon: 81.8, center: { lat: 18.1124, lon: 79.0193 } },
  'PB': { minLat: 29.5, maxLat: 32.5, minLon: 73.9, maxLon: 76.9, center: { lat: 31.1471, lon: 75.3412 } },
  'HR': { minLat: 27.6, maxLat: 30.9, minLon: 74.5, maxLon: 77.6, center: { lat: 29.0588, lon: 76.0856 } },
  'BR': { minLat: 24.3, maxLat: 27.5, minLon: 83.3, maxLon: 88.3, center: { lat: 25.0961, lon: 85.3131 } },
  'OR': { minLat: 17.8, maxLat: 22.6, minLon: 81.3, maxLon: 87.5, center: { lat: 20.9517, lon: 85.0985 } },
  'MP': { minLat: 21.1, maxLat: 26.9, minLon: 74.0, maxLon: 82.8, center: { lat: 22.9734, lon: 78.6569 } },
  'AS': { minLat: 24.1, maxLat: 28.0, minLon: 89.7, maxLon: 96.0, center: { lat: 26.2006, lon: 92.9376 } },
  'JH': { minLat: 21.9, maxLat: 25.4, minLon: 83.3, maxLon: 87.9, center: { lat: 23.6102, lon: 85.2799 } },
  'CT': { minLat: 17.8, maxLat: 24.1, minLon: 80.2, maxLon: 84.4, center: { lat: 21.2787, lon: 81.8661 } },
  'UK': { minLat: 28.4, maxLat: 31.4, minLon: 77.5, maxLon: 81.1, center: { lat: 30.0668, lon: 79.0193 } },
  'HP': { minLat: 30.4, maxLat: 33.3, minLon: 75.6, maxLon: 79.1, center: { lat: 31.1048, lon: 77.1734 } },
  'JK': { minLat: 32.2, maxLat: 37.1, minLon: 72.6, maxLon: 80.3, center: { lat: 33.7782, lon: 76.5762 } },
  'GA': { minLat: 14.9, maxLat: 15.8, minLon: 73.7, maxLon: 74.3, center: { lat: 15.2993, lon: 74.1240 } },
  'MN': { minLat: 23.8, maxLat: 25.7, minLon: 93.0, maxLon: 94.8, center: { lat: 24.6637, lon: 93.9063 } },
  'ML': { minLat: 25.0, maxLat: 26.1, minLon: 89.7, maxLon: 92.9, center: { lat: 25.4670, lon: 91.3662 } },
  'NL': { minLat: 25.2, maxLat: 27.0, minLon: 93.2, maxLon: 95.2, center: { lat: 26.1584, lon: 94.5624 } },
  'TR': { minLat: 22.9, maxLat: 24.5, minLon: 91.1, maxLon: 92.4, center: { lat: 23.9408, lon: 91.9882 } },
  'MZ': { minLat: 21.9, maxLat: 24.5, minLon: 92.2, maxLon: 93.5, center: { lat: 23.1645, lon: 92.9376 } },
  'AR': { minLat: 26.3, maxLat: 29.5, minLon: 91.3, maxLon: 97.5, center: { lat: 28.2180, lon: 94.7278 } },
  'SK': { minLat: 27.0, maxLat: 28.1, minLon: 88.0, maxLon: 88.9, center: { lat: 27.5330, lon: 88.5122 } },
  'PY': { minLat: 10.9, maxLat: 12.0, minLon: 79.6, maxLon: 79.9, center: { lat: 11.9416, lon: 79.8083 } },
  'AN': { minLat: 6.5, maxLat: 14.5, minLon: 92.2, maxLon: 94.0, center: { lat: 11.7401, lon: 92.6586 } },
  'CH': { minLat: 30.6, maxLat: 30.8, minLon: 76.6, maxLon: 76.9, center: { lat: 30.7333, lon: 76.7794 } },
  'DN': { minLat: 20.1, maxLat: 20.5, minLon: 72.8, maxLon: 73.2, center: { lat: 20.3974, lon: 72.8328 } },
  'DD': { minLat: 20.7, maxLat: 20.9, minLon: 70.9, maxLon: 71.0, center: { lat: 20.7602, lon: 70.9765 } },
  'LD': { minLat: 8.2, maxLat: 12.3, minLon: 71.5, maxLon: 74.0, center: { lat: 10.5667, lon: 72.6417 } },
  'LA': { minLat: 32.2, maxLat: 33.3, minLon: 76.6, maxLon: 79.1, center: { lat: 34.2996, lon: 78.2932 } },
};

// India boundary for clipping/focus
export const INDIA_BOUNDARY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [68.0, 6.0],
        [98.0, 6.0],
        [98.0, 38.0],
        [68.0, 38.0],
        [68.0, 6.0]
      ]]
    }
  }]
};

// Weather layer types
export type WeatherLayerType = 'temperature' | 'rainfall' | 'humidity' | 'wind' | 'none';

export interface WeatherLayerConfig {
  id: WeatherLayerType;
  label: string;
  icon: string;
  description: string;
  colorScale: Array<[number, string]>;
  unit: string;
  dataField: string;
  tooltipFormatter: (value: number) => string;
}

// Weather layer configurations
export const WEATHER_LAYERS: WeatherLayerConfig[] = [
  {
    id: 'temperature',
    label: 'Temperature',
    icon: '🌡️',
    description: 'Air temperature at 2m',
    colorScale: [
      [-10, '#061d4e'], [0, '#0d3b82'], [10, '#145db8'], [20, '#16a34a'],
      [25, '#4ade80'], [30, '#eab308'], [35, '#f97316'], [40, '#dc2626'], [45, '#7f1d1d']
    ],
    unit: '°C',
    dataField: 'temperature',
    tooltipFormatter: (v) => `${Math.round(v)}°C`
  },
  {
    id: 'rainfall',
    label: 'Rainfall',
    icon: '🌧️',
    description: 'Precipitation accumulation',
    colorScale: [
      [0, '#1e293b'], [2.5, '#0ea5e9'], [10, '#38bdf8'], [25, '#22d3ee'],
      [50, '#84cc16'], [75, '#eab308'], [100, '#f97316'], [200, '#ef4444']
    ],
    unit: 'mm',
    dataField: 'precipitation',
    tooltipFormatter: (v) => `${v.toFixed(1)} mm`
  },
  {
    id: 'humidity',
    label: 'Humidity',
    icon: '💧',
    description: 'Relative humidity',
    colorScale: [
      [0, '#1e293b'], [20, '#0ea5e9'], [40, '#38bdf8'], [60, '#22d3ee'],
      [80, '#84cc16'], [90, '#eab308'], [100, '#f97316']
    ],
    unit: '%',
    dataField: 'humidity',
    tooltipFormatter: (v) => `${Math.round(v)}%`
  },
  {
    id: 'wind',
    label: 'Wind Speed',
    icon: '💨',
    description: 'Wind speed at 10m',
    colorScale: [
      [0, '#1e293b'], [5, '#0ea5e9'], [15, '#38bdf8'], [25, '#22d3ee'],
      [40, '#84cc16'], [60, '#eab308'], [80, '#f97316'], [100, '#ef4444']
    ],
    unit: 'km/h',
    dataField: 'windSpeed',
    tooltipFormatter: (v) => `${Math.round(v)} km/h`
  }
];

// Get weather layer config by ID
export function getWeatherLayerConfig(type: WeatherLayerType): WeatherLayerConfig | undefined {
  return WEATHER_LAYERS.find(l => l.id === type);
}

// Create weather layer for state polygons
export function createWeatherLayer(layerType: WeatherLayerType): LayerSpecification[] {
  const config = getWeatherLayerConfig(layerType);
  if (!config || layerType === 'none') return [];

  return [
    {
      id: `weather-${config.id}-fill`,
      type: 'fill',
      source: 'states',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', config.dataField], 0],
          ...config.colorScale.flat()
        ],
        'fill-opacity': 0.18,
        'fill-antialias': true,
      },
    },
    {
      id: `weather-${config.id}-outline`,
      type: 'line',
      source: 'states',
      paint: {
        'line-color': '#ffffff',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          3, 0.5,
          5, 1,
          7, 1.5,
          9, 2,
        ],
        'line-opacity': 0.6,
        'line-blur': 0,
      },
    }
  ];
}

// Convert GeoJSON to MapLibre style layers
export function createStateLayers(geojson: GeoJSON.FeatureCollection): LayerSpecification[] {
  return [
    // Base fill for all states (subtle background)
    {
      id: 'states-fill-base',
      type: 'fill',
      source: 'states',
      paint: {
        'fill-color': '#0a1628',
        'fill-opacity': 0.3,
        'fill-antialias': true,
      },
    },
    // Temperature-based subtle geospatial tint (translucent so realistic satellite terrain shines through)
    {
      id: 'states-fill-extrusion',
      type: 'fill',
      source: 'states',
      paint: {
        'fill-color': [
          'case', ['has', 'temperature'],
          ['interpolate', ['linear'], ['get', 'temperature'],
            -10, '#061d4e', 0, '#0d3b82', 10, '#145db8', 20, '#16a34a',
            25, '#4ade80', 30, '#eab308', 35, '#f97316', 40, '#dc2626', 45, '#7f1d1d',
          ],
          '#334155',
        ],
        'fill-opacity': 0.12,
        'fill-antialias': true,
      },
    },
    // Sharp state boundaries - primary outline
    {
      id: 'states-outline-sharp',
      type: 'line',
      source: 'states',
      paint: {
        'line-color': '#ffffff',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          3, 0.5,
          5, 1,
          7, 1.5,
          9, 2,
        ],
        'line-opacity': 0.9,
        'line-blur': 0,
      },
    },
    // Secondary glow outline for emphasis
    {
      id: 'states-outline-glow',
      type: 'line',
      source: 'states',
      paint: {
        'line-color': '#38bdf8',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          3, 1,
          5, 2,
          7, 3,
          9, 4,
        ],
        'line-opacity': 0.3,
        'line-blur': 2,
      },
    },
    // State labels with better styling
    {
      id: 'states-labels',
      type: 'symbol',
      source: 'states',
      minzoom: 3,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          3, 10,
          5, 12,
          7, 14,
          9, 16,
        ],
        'text-anchor': 'center',
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-variable-anchor': ['center'],
        'text-radial-offset': 0,
      },
      paint: {
        'text-color': '#f1f5f9',
        'text-halo-color': '#020617',
        'text-halo-width': 2,
        'text-halo-blur': 0,
      },
    },
    // Temperature labels for states
    {
      id: 'states-temp-labels',
      type: 'symbol',
      source: 'states',
      minzoom: 5,
      filter: ['has', 'temperature'],
      layout: {
        'text-field': ['concat', ['number-format', ['get', 'temperature'], {}], '°'],
        'text-font': ['Noto Sans Medium'],
        'text-size': 11,
        'text-anchor': 'center',
        'text-offset': [0, 18],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#020617',
        'text-halo-width': 2,
      },
    },
  ];
}

export function createDistrictLayers(geojson: GeoJSON.FeatureCollection): LayerSpecification[] {
  return [
    {
      id: 'districts-fill',
      type: 'fill',
      source: 'districts',
      paint: {
        'fill-color': [
          'case', ['has', 'temperature'],
          ['interpolate', ['linear'], ['get', 'temperature'],
            -10, '#061d4e', 0, '#0d3b82', 10, '#145db8', 20, '#16a34a',
            25, '#4ade80', 30, '#eab308', 35, '#f97316', 40, '#dc2626', 45, '#7f1d1d',
          ],
          '#334155',
        ],
        'fill-opacity': 0.7,
        'fill-antialias': true,
      },
    },
    {
      id: 'districts-outline',
      type: 'line',
      source: 'districts',
      paint: {
        'line-color': '#475569',
        'line-width': 1,
        'line-opacity': 0.5,
      },
    },
    {
      id: 'districts-labels',
      type: 'symbol',
      source: 'districts',
      minzoom: 7,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#94a3b8',
        'text-halo-color': '#020617',
        'text-halo-width': 1.5,
      },
    },
  ];
}

export function createWeatherMarkerLayers(): LayerSpecification[] {
  return [
    // Tier 3 cities - smallest, subtle
    {
      id: 'weather-markers-tier3',
      type: 'circle',
      source: 'weather-markers',
      filter: ['all', ['!=', ['get', 'type'], 'selected'], ['==', ['get', 'tier'], 3]],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 3,
          6, 4,
          8, 5,
          10, 6,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'temperature'], -999],
          -999, '#64748b',
          -10, '#0ea5e9',
          0, '#38bdf8',
          10, '#22d3ee',
          20, '#84cc16',
          25, '#a3e635',
          30, '#eab308',
          35, '#f97316',
          40, '#ef4444',
          45, '#b91c1c',
        ],
        'circle-stroke-color': '#020617',
        'circle-stroke-width': 1,
        'circle-opacity': 0.7,
      },
    },
    // Tier 2 cities - medium
    {
      id: 'weather-markers-tier2',
      type: 'circle',
      source: 'weather-markers',
      filter: ['all', ['!=', ['get', 'type'], 'selected'], ['==', ['get', 'tier'], 2]],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 4,
          6, 6,
          8, 7,
          10, 8,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'temperature'], -999],
          -999, '#64748b',
          -10, '#0ea5e9',
          0, '#38bdf8',
          10, '#22d3ee',
          20, '#84cc16',
          25, '#a3e635',
          30, '#eab308',
          35, '#f97316',
          40, '#ef4444',
          45, '#b91c1c',
        ],
        'circle-stroke-color': '#020617',
        'circle-stroke-width': 1.5,
        'circle-opacity': 0.85,
      },
    },
    // Tier 1 cities - larger, more prominent
    {
      id: 'weather-markers-tier1',
      type: 'circle',
      source: 'weather-markers',
      filter: ['all', ['!=', ['get', 'type'], 'selected'], ['==', ['get', 'tier'], 1]],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 5,
          6, 7,
          8, 9,
          10, 11,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'temperature'], -999],
          -999, '#64748b',
          -10, '#0ea5e9',
          0, '#38bdf8',
          10, '#22d3ee',
          20, '#84cc16',
          25, '#a3e635',
          30, '#eab308',
          35, '#f97316',
          40, '#ef4444',
          45, '#b91c1c',
        ],
        'circle-stroke-color': '#020617',
        'circle-stroke-width': 2,
        'circle-opacity': 0.95,
      },
    },
    // Live data cities (state capitals, districts) - most prominent with ring
    {
      id: 'weather-markers-live',
      type: 'circle',
      source: 'weather-markers',
      filter: ['all', ['!=', ['get', 'temperature'], ['literal', null]], ['!=', ['get', 'type'], 'selected'], ['in', ['get', 'type'], ['literal', ['state-centre-live', 'district-live']]]],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 6,
          6, 8,
          8, 10,
          10, 12,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'temperature'], -999],
          -999, '#64748b',
          -10, '#0ea5e9',
          0, '#38bdf8',
          10, '#22d3ee',
          20, '#84cc16',
          25, '#a3e635',
          30, '#eab308',
          35, '#f97316',
          40, '#ef4444',
          45, '#b91c1c',
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2.5,
        'circle-opacity': 1,
      },
    },
    // Glow effect for live data
    {
      id: 'weather-markers-live-glow',
      type: 'circle',
      source: 'weather-markers',
      filter: ['all', ['!=', ['get', 'temperature'], ['literal', null]], ['!=', ['get', 'type'], 'selected'], ['in', ['get', 'type'], ['literal', ['state-centre-live', 'district-live']]]],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 12,
          6, 16,
          8, 20,
          10, 24,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'temperature'], -999],
          -999, '#64748b',
          -10, '#0ea5e9',
          0, '#38bdf8',
          10, '#22d3ee',
          20, '#84cc16',
          25, '#a3e635',
          30, '#eab308',
          35, '#f97316',
          40, '#ef4444',
          45, '#b91c1c',
        ],
        'circle-opacity': 0.3,
        'circle-blur': 0.5,
      },
    },
    // Glow effect for all cities
    {
      id: 'weather-markers-glow',
      type: 'circle',
      source: 'weather-markers',
      filter: ['all', ['!=', ['get', 'temperature'], ['literal', null]], ['!=', ['get', 'type'], 'selected'], ['!', ['in', ['get', 'type'], ['literal', ['state-centre-live', 'district-live', 'selected']]]]],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 8,
          6, 12,
          8, 16,
          10, 20,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'temperature'], -999],
          -999, '#64748b',
          -10, '#0ea5e9',
          0, '#38bdf8',
          10, '#22d3ee',
          20, '#84cc16',
          25, '#a3e635',
          30, '#eab308',
          35, '#f97316',
          40, '#ef4444',
          45, '#b91c1c',
        ],
        'circle-opacity': 0.2,
        'circle-blur': 0.5,
      },
    },
    // City labels for tier 1 & live
    {
      id: 'weather-marker-labels-tier1',
      type: 'symbol',
      source: 'weather-markers',
      filter: ['all', ['has', 'temperature'], ['!=', ['get', 'type'], 'selected'], ['in', ['get', 'type'], ['literal', ['tier1-city', 'state-centre-live', 'district-live']]]],
      minzoom: 5,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10,
        'text-anchor': 'top',
        'text-offset': [0, 1.2],
        'text-allow-overlap': false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color': '#e2e8f0',
        'text-halo-color': '#020617',
        'text-halo-width': 1.5,
      },
    },
    // City labels for tier 2
    {
      id: 'weather-marker-labels-tier2',
      type: 'symbol',
      source: 'weather-markers',
      filter: ['all', ['!=', ['get', 'type'], 'selected'], ['==', ['get', 'type'], 'tier2-city']],
      minzoom: 6,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 9,
        'text-anchor': 'top',
        'text-offset': [0, 1.2],
        'text-allow-overlap': false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color': '#94a3b8',
        'text-halo-color': '#020617',
        'text-halo-width': 1.5,
      },
    },
    // Temperature labels for tier 1 & live
    {
      id: 'weather-marker-temps-tier1',
      type: 'symbol',
      source: 'weather-markers',
      filter: ['all', ['!=', ['get', 'temperature'], ['literal', null]], ['!=', ['get', 'type'], 'selected'], ['in', ['get', 'type'], ['literal', ['tier1-city', 'state-centre-live', 'district-live']]]],
      minzoom: 5,
      layout: {
        'text-field': ['concat', ['number-format', ['get', 'temperature'], {}], '°'],
        'text-font': ['Noto Sans Medium'],
        'text-size': 11,
        'text-anchor': 'bottom',
        'text-offset': [0, -1.2],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#020617',
        'text-halo-width': 2,
      },
    },
    // Temperature labels for tier 2
    {
      id: 'weather-marker-temps-tier2',
      type: 'symbol',
      source: 'weather-markers',
      filter: ['all', ['has', 'temperature'], ['!=', ['get', 'type'], 'selected'], ['==', ['get', 'type'], 'tier2-city']],
      minzoom: 6,
      layout: {
        'text-field': ['concat', ['number-format', ['get', 'temperature'], {}], '°'],
        'text-font': ['Noto Sans Medium'],
        'text-size': 10,
        'text-anchor': 'bottom',
        'text-offset': [0, -1.2],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#020617',
        'text-halo-width': 2,
      },
    },
    // Capital indicator
    {
      id: 'weather-marker-capital',
      type: 'symbol',
      source: 'weather-markers',
      filter: ['all', ['!=', ['get', 'type'], 'selected'], ['==', ['get', 'isCapital'], true]],
      minzoom: 4,
      layout: {
        'text-field': '★',
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-anchor': 'bottom',
        'text-offset': [0, -1.5],
      },
      paint: {
        'text-color': '#fbbf24',
        'text-halo-color': '#020617',
        'text-halo-width': 2,
      },
    },
    // Selected location marker
    {
      id: 'selected-location',
      type: 'circle',
      source: 'selected-location',
      paint: {
        'circle-radius': 16,
        'circle-color': '#ffffff',
        'circle-stroke-color': '#0ea5e9',
        'circle-stroke-width': 3,
        'circle-opacity': 1,
      },
    },
    // Selected location label
    {
      id: 'selected-location-label',
      type: 'symbol',
      source: 'selected-location',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
        'text-anchor': 'top',
        'text-offset': [0, 1.5],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#020617',
        'text-halo-width': 2,
      },
    },
  ];
}

export function createSelectedLocationLayer(): LayerSpecification {
  return {
    id: 'selected-location',
    type: 'circle',
    source: 'selected-location',
    paint: {
      'circle-radius': 14,
      'circle-color': '#ffffff',
      'circle-stroke-color': '#0ea5e9',
      'circle-stroke-width': 3,
      'circle-opacity': 1,
    },
  };
}

export function createSelectedLocationPulseLayer(): LayerSpecification {
  return {
    id: 'selected-location-pulse',
    type: 'circle',
    source: 'selected-location',
    paint: {
      'circle-radius': 24,
      'circle-color': '#0ea5e9',
      'circle-opacity': 0.4,
    },
  };
}

// Color utilities for weather
export function getTemperatureColor(temp: number): string {
  if (temp <= -10) return '#061d4e';
  if (temp <= 0) return '#0d3b82';
  if (temp <= 10) return '#145db8';
  if (temp <= 20) return '#16a34a';
  if (temp <= 25) return '#4ade80';
  if (temp <= 30) return '#eab308';
  if (temp <= 35) return '#f97316';
  if (temp <= 40) return '#dc2626';
  return '#7f1d1d';
}

export function getPrecipitationColor(precip: number): string {
  if (precip <= 0) return '#1e293b';
  if (precip <= 2.5) return '#0ea5e9';
  if (precip <= 10) return '#38bdf8';
  if (precip <= 25) return '#22d3ee';
  if (precip <= 50) return '#84cc16';
  if (precip <= 75) return '#eab308';
  if (precip <= 100) return '#f97316';
  return '#ef4444';
}

export function getAlertColor(severity: string): string {
  switch (severity) {
    case 'info': return '#0ea5e9';
    case 'warning': return '#eab308';
    case 'severe': return '#f97316';
    case 'extreme': return '#ef4444';
    default: return '#64748b';
  }
}

export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] || 'Unknown';
}

export function getWindDirectionText(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Map style configurations
// Dark style (default) - using ESRI Dark Gray Canvas
export const MAP_STYLE_DARK = {
  version: 8 as const,
  name: 'India Weather Dark',
  sources: {
    'esri-dark': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#020617',
      },
    },
    {
      id: 'esri-dark-tiles',
      type: 'raster',
      source: 'esri-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sprite: 'https://demotiles.maplibre.org/sprite',
};

// Satellite style - ESRI World Imagery
export const MAP_STYLE_SATELLITE = {
  version: 8 as const,
  name: 'India Weather Satellite',
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#020617',
      },
    },
    {
      id: 'esri-satellite-tiles',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sprite: 'https://demotiles.maplibre.org/sprite',
};

// Hybrid style - Satellite with labels overlay
export const MAP_STYLE_HYBRID = {
  version: 8 as const,
  name: 'India Weather Hybrid',
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
    'esri-reference': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#020617',
      },
    },
    {
      id: 'esri-satellite-tiles',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 20,
    },
    {
      id: 'esri-reference-tiles',
      type: 'raster',
      source: 'esri-reference',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sprite: 'https://demotiles.maplibre.org/sprite',
};

// MapTiler styles (require API key - use environment variable)
export function createMapTilerStyle(style: 'satellite' | 'hybrid' | 'streets' | 'dark', apiKey?: string): maplibregl.StyleSpecification {
  const key = apiKey || import.meta.env.VITE_MAPTILER_API_KEY || 'demo';
  const baseUrl = `https://api.maptiler.com/maps`;
  
  const styleConfigs = {
    satellite: {
      name: 'MapTiler Satellite',
      styleUrl: `${baseUrl}/${style}/style.json?key=${key}`,
    },
    hybrid: {
      name: 'MapTiler Hybrid',
      styleUrl: `${baseUrl}/hybrid/style.json?key=${key}`,
    },
    streets: {
      name: 'MapTiler Streets',
      styleUrl: `${baseUrl}/streets/style.json?key=${key}`,
    },
    dark: {
      name: 'MapTiler Dark',
      styleUrl: `${baseUrl}/dark/style.json?key=${key}`,
    }
  };

  const config = styleConfigs[style];
  
  return {
    version: 8,
    name: config.name,
    sources: {},
    layers: [],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sprite: 'https://demotiles.maplibre.org/sprite',
  };
}

// Terrain/DEM source for 3D elevation using open AWS Terrarium tiles
export const TERRAIN_SOURCE = {
  type: 'raster-dem' as const,
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  tileSize: 256,
  encoding: 'terrarium' as const,
  maxzoom: 15,
  attribution: '&copy; Mapzen, OpenStreetMap contributors',
};

// Sky layer for atmospheric effect
export const SKY_LAYER: any = {
  id: 'sky',
  type: 'sky',
  paint: {
    'sky-type': 'atmosphere',
    'sky-atmosphere-sun': [0, 0],
    'sky-atmosphere-sun-intensity': 15,
    'sky-atmosphere-halo-color': 'rgba(56, 189, 248, 0.3)',
    'sky-atmosphere-color': 'rgba(7, 17, 31, 1)',
  },
};

// Fog layer for atmospheric depth
export const FOG_LAYER: any = {
  id: 'fog',
  type: 'fog',
  paint: {
    'fog-color': '#07111F',
    'fog-high-color': '#0D1828',
    'fog-ground-blend': 0.25,
    'fog-end': 60000,
    'fog-start': 2000,
  },
};

// Available map styles for UI
export const MAP_STYLES = [
  { id: 'hybrid', name: 'Satellite Hybrid', icon: '🛰️', description: 'Realistic satellite with borders and labels' },
  { id: 'satellite', name: 'Satellite Pure', icon: '🌍', description: 'Photorealistic orbital satellite view' },
  { id: 'dark', name: 'Dark Canvas', icon: '🌙', description: 'Deep cinematic contrast for weather data' },
] as const;

export type MapStyleId = 'hybrid' | 'satellite' | 'dark';

// Resolves style URL or specification, using MapTiler if key provided, otherwise rock-solid ESRI fallback
export function getMapStyle(styleId: MapStyleId): string | maplibregl.StyleSpecification {
  const maptilerKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAPTILER_API_KEY;
  if (maptilerKey && maptilerKey.trim() !== '' && maptilerKey !== 'demo') {
    if (styleId === 'satellite') return `https://api.maptiler.com/maps/satellite/style.json?key=${maptilerKey}`;
    if (styleId === 'hybrid') return `https://api.maptiler.com/maps/hybrid/style.json?key=${maptilerKey}`;
    if (styleId === 'dark') return `https://api.maptiler.com/maps/dark/style.json?key=${maptilerKey}`;
  }
  
  if (styleId === 'satellite') return MAP_STYLE_SATELLITE as maplibregl.StyleSpecification;
  if (styleId === 'hybrid') return MAP_STYLE_HYBRID as maplibregl.StyleSpecification;
  return MAP_STYLE_DARK as maplibregl.StyleSpecification;
}

// Default style (hybrid satellite)
export const MAP_STYLE = MAP_STYLE_HYBRID;

// Viewport constants - Framing all of India with a cinematic 3D perspective
export const INDIA_VIEWPORT: { center: Coordinates; zoom: number; bearing: number; pitch: number } = {
  center: { lat: 21.0, lon: 78.9629 },
  zoom: 4.6,
  bearing: 0,
  pitch: 38,
};

export const INDIA_BOUNDS: BoundingBox = {
  minLat: 6.5,
  maxLat: 37.5,
  minLon: 68.5,
  maxLon: 97.5,
};

export function getStateBounds(stateCode: string): { center: Coordinates; bounds: BoundingBox } | null {
  const state = STATE_BOUNDS[stateCode.toUpperCase()];
  if (!state) return null;
  const { center, minLat, maxLat, minLon, maxLon } = state;
  return { center, bounds: { minLat, maxLat, minLon, maxLon } };
}

export function getDistrictBounds(stateCode: string, districtCode: string): { center: Coordinates; bounds: BoundingBox } | null {
  // Placeholder - would be populated from district GeoJSON
  return getStateBounds(stateCode);
}

// Format coordinates for display
export function formatCoordinates(coords: Coordinates): string {
  const latDir = coords.lat >= 0 ? 'N' : 'S';
  const lonDir = coords.lon >= 0 ? 'E' : 'W';
  return `${Math.abs(coords.lat).toFixed(4)}°${latDir}, ${Math.abs(coords.lon).toFixed(4)}°${lonDir}`;
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lon - coord1.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Get UV index description
export function getUVIndexDescription(uvIndex: number): { label: string; color: string; protection: string } {
  if (uvIndex <= 2) return { label: 'Low', color: '#22c55e', protection: 'No protection needed' };
  if (uvIndex <= 5) return { label: 'Moderate', color: '#eab308', protection: 'Seek shade midday, wear sunscreen' };
  if (uvIndex <= 7) return { label: 'High', color: '#f97316', protection: 'Protection required, avoid midday sun' };
  if (uvIndex <= 10) return { label: 'Very High', color: '#ef4444', protection: 'Extra protection, avoid sun 10-4' };
  return { label: 'Extreme', color: '#a855f7', protection: 'Avoid sun exposure, full protection' };
}

// Get wind speed description
export function getWindSpeedDescription(speed: number): { label: string; beaufort: number } {
  if (speed < 1) return { label: 'Calm', beaufort: 0 };
  if (speed < 6) return { label: 'Light air', beaufort: 1 };
  if (speed < 12) return { label: 'Light breeze', beaufort: 2 };
  if (speed < 20) return { label: 'Gentle breeze', beaufort: 3 };
  if (speed < 29) return { label: 'Moderate breeze', beaufort: 4 };
  if (speed < 39) return { label: 'Fresh breeze', beaufort: 5 };
  if (speed < 50) return { label: 'Strong breeze', beaufort: 6 };
  if (speed < 62) return { label: 'Near gale', beaufort: 7 };
  if (speed < 75) return { label: 'Gale', beaufort: 8 };
  if (speed < 89) return { label: 'Strong gale', beaufort: 9 };
  if (speed < 103) return { label: 'Storm', beaufort: 10 };
  if (speed < 118) return { label: 'Violent storm', beaufort: 11 };
  return { label: 'Hurricane', beaufort: 12 };
}
