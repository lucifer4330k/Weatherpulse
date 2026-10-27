import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import maplibregl, { Map, LngLatLike, MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore, useViewport, useSelectedLocation, useNavigationLevel, useSelectedState, useWeatherData, useIndiaOverview, useStateDistricts } from '../../store/useAppStore';
import { useCassandraCities, useCassandraLatestMultiple } from '../../hooks/useWeather';
import type { Coordinates } from '../../types';
import {
  createStateLayers,
  createDistrictLayers,
  createWeatherMarkerLayers,
  createSelectedLocationLayer,
  createSelectedLocationPulseLayer,
  TERRAIN_SOURCE,
  SKY_CONFIG,
  MapStyleId,
  getMapStyle,
  createWeatherLayer,
  WeatherLayerType,
  getStateBounds,
  formatCoordinates,
} from '../../services/mapUtils';

const statesGeoJSONUrl = '/geojson/india-states.geojson';
const indiaDistrictsGeoJSONUrl = '/geojson/india-districts.geojson';

// Import cities data
import { INDIA_CITIES } from '../../data/india-cities';

interface MapContainerProps {
  onMapLoad?: (map: Map) => void;
  onMapClick?: (coords: Coordinates) => void;
  mapStyle?: MapStyleId;
  weatherLayer?: WeatherLayerType;
  is3D?: boolean;
}

export function MapContainer({ 
  onMapLoad, 
  onMapClick,
  mapStyle: propMapStyle,
  weatherLayer: propWeatherLayer,
  is3D = true,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMapLoaded = useRef(false);
  const [mapStyle, setMapStyle] = useState<MapStyleId>(propMapStyle || 'hybrid');
  const [weatherLayer, setWeatherLayer] = useState<WeatherLayerType>(propWeatherLayer || 'temperature');
  const showTerrain = false;
  const [clickedCoords, setClickedCoords] = useState<Coordinates | null>(null);

  // Store selectors
  const viewport = useViewport();
  const selectedLocation = useSelectedLocation();
  const navigationLevel = useNavigationLevel();
  const selectedState = useSelectedState();
  const setViewport = useAppStore((state) => state.setViewport);
  const setSelectedLocation = useAppStore((state) => state.setSelectedLocation);

  // Data from store
  const indiaOverview = useIndiaOverview();
  const stateDistricts = useStateDistricts();
  const weatherData = useWeatherData();
  
  // Only request cities for which the ingestion pipeline has persisted data.
  const { data: availableCities } = useCassandraCities();
  const cityNames = useMemo(() => availableCities?.cities ?? [], [availableCities]);
  const { data: cassandraLatestMap } = useCassandraLatestMultiple(cityNames);

  // Get current style object via getMapStyle
  const currentStyle = getMapStyle(mapStyle);

  // Sync map style prop
  useEffect(() => {
    if (propMapStyle && propMapStyle !== mapStyle) {
      switchMapStyle(propMapStyle);
    }
  }, [propMapStyle]);

  // Sync weather layer prop
  useEffect(() => {
    if (propWeatherLayer && propWeatherLayer !== weatherLayer) {
      switchWeatherLayer(propWeatherLayer);
    }
  }, [propWeatherLayer]);

  // Sync 3D pitch prop
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current) return;
    map.easeTo({ pitch: is3D ? 38 : 0, duration: 600 });
  }, [is3D]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || isMapLoaded.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: currentStyle,
      center: [viewport.center.lon, viewport.center.lat] as LngLatLike,
      zoom: viewport.zoom,
      bearing: viewport.bearing,
      pitch: is3D ? 38 : 0,
      antialias: true,
      preserveDrawingBuffer: true,
      maxBounds: [[68.0, 6.0], [98.0, 38.0]] as [LngLatLike, LngLatLike],
    });

    mapRef.current = map;

    map.on('load', () => {
      isMapLoaded.current = true;
      setupMapSources(map);
      setupMapLayers(map);
      setupMapEvents(map);
      addTerrainAndAtmosphere(map);
      onMapLoad?.(map);
    });

    map.on('style.load', () => {
      if (isMapLoaded.current) {
        setupMapSources(map);
        setupMapLayers(map);
        addTerrainAndAtmosphere(map);
      }
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      isMapLoaded.current = false;
    };
  }, []);

  // Add terrain and atmospheric effects
  const addTerrainAndAtmosphere = useCallback((map: Map) => {
    // Add terrain source if not present and terrain is enabled
    if (showTerrain && !map.getSource('terrain')) {
      map.addSource('terrain', TERRAIN_SOURCE);
      map.setTerrain({ source: 'terrain', exaggeration: 1.5 });
    } else if (!showTerrain && map.getSource('terrain')) {
      map.setTerrain(null);
      map.removeSource('terrain');
    }

    // Sky and fog are root style properties in MapLibre, not data layers.
    map.setSky(SKY_CONFIG);
  }, [showTerrain]);

  // Switch map style
  const switchMapStyle = useCallback((style: MapStyleId) => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current) return;

    setMapStyle(style);
    const newStyle = getMapStyle(style);
    map.setStyle(newStyle);
    
    // Re-add sources and layers after style change
    map.once('style.load', () => {
      setupMapSources(map);
      setupMapLayers(map);
      addTerrainAndAtmosphere(map);
    });
  }, [showTerrain]);

  // Toggle weather layer
  const switchWeatherLayer = useCallback((layer: WeatherLayerType) => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current) return;

    setWeatherLayer(layer);
    
    // Remove existing weather layers
    const existingLayers = map.getStyle().layers?.filter(l => l.id.startsWith('weather-')) || [];
    existingLayers.forEach(l => {
      if (map.getLayer(l.id)) map.removeLayer(l.id);
    });

    // Add new weather layer if not 'none'
    if (layer !== 'none') {
      const weatherLayers = createWeatherLayer(layer);
      weatherLayers.forEach(l => {
        if (!map.getLayer(l.id)) map.addLayer(l);
      });
    }
  }, []);

  // Setup data sources
  const setupMapSources = useCallback((map: Map) => {
    // States source
    if (!map.getSource('states')) {
      map.addSource('states', {
        type: 'geojson',
        data: statesGeoJSONUrl,
        generateId: true,
      });
    }

    // Districts source with actual district boundaries
    if (!map.getSource('districts')) {
      map.addSource('districts', {
        type: 'geojson',
        data: indiaDistrictsGeoJSONUrl,
        generateId: true,
      });
    }

    // Weather markers source
    if (!map.getSource('weather-markers')) {
      map.addSource('weather-markers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // Selected location source
    if (!map.getSource('selected-location')) {
      map.addSource('selected-location', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // Clicked location source
    if (!map.getSource('clicked-location')) {
      map.addSource('clicked-location', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
  }, []);

  // Setup map layers
  const setupMapLayers = useCallback((map: Map) => {
    // Add state layers
    const stateLayers = createStateLayers();
    stateLayers.forEach((layer) => {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer);
      }
    });

    // Add district layers
    const districtLayers = createDistrictLayers();
    districtLayers.forEach((layer) => {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer);
      }
    });

    // Add weather marker layers
    const markerLayers = createWeatherMarkerLayers();
    markerLayers.forEach((layer) => {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer);
      }
    });

    // Add selected location layers
    const selectedLayer = createSelectedLocationLayer();
    if (!map.getLayer(selectedLayer.id)) {
      map.addLayer(selectedLayer);
    }

    const pulseLayer = createSelectedLocationPulseLayer();
    if (!map.getLayer(pulseLayer.id)) {
      map.addLayer(pulseLayer);
    }

    // Clicked location marker layer
    if (!map.getLayer('clicked-location-marker')) {
      map.addLayer({
        id: 'clicked-location-marker',
        type: 'circle',
        source: 'clicked-location',
        paint: {
          'circle-radius': 12,
          'circle-color': '#f97316',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
          'circle-opacity': 1,
        },
      });
    }

    if (!map.getLayer('clicked-location-pulse')) {
      map.addLayer({
        id: 'clicked-location-pulse',
        type: 'circle',
        source: 'clicked-location',
        paint: {
          'circle-radius': 20,
          'circle-color': '#f97316',
          'circle-opacity': 0.4,
        },
      });
    }

    // Clicked location label
    if (!map.getLayer('clicked-location-label')) {
      map.addLayer({
        id: 'clicked-location-label',
        type: 'symbol',
        source: 'clicked-location',
        layout: {
          'text-field': ['get', 'coords'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-anchor': 'top',
          'text-offset': [0, 1.5],
        },
        paint: {
          'text-color': '#f97316',
          'text-halo-color': '#020617',
          'text-halo-width': 2,
        },
      });
    }

    // Add current weather layer if not 'none'
    if (weatherLayer !== 'none') {
      const weatherLayers = createWeatherLayer(weatherLayer);
      weatherLayers.forEach(l => {
        if (!map.getLayer(l.id)) map.addLayer(l);
      });
    }
  }, [weatherLayer]);

  // Setup map events
  const setupMapEvents = useCallback((map: Map) => {
    // Click on map
    map.on('click', (e: MapMouseEvent) => {
      const coords: Coordinates = {
        lat: e.lngLat.lat,
        lon: e.lngLat.lng,
      };

      // Check if clicked on a state polygon
      const stateFeatures = map.queryRenderedFeatures(e.point, { layers: ['states-fill-extrusion'] });
      if (stateFeatures.length > 0 && navigationLevel === 'india') {
        const stateCode = stateFeatures[0].properties?.code as string;
        if (stateCode) {
          handleStateClick(map, stateCode);
          return;
        }
      }

      // Check if clicked on a district polygon
      const districtFeatures = map.queryRenderedFeatures(e.point, { layers: ['districts-fill'] });
      if (districtFeatures.length > 0 && navigationLevel === 'state' && selectedState) {
        const districtCode = districtFeatures[0].properties?.code as string;
        if (districtCode) {
          handleDistrictClick(map, selectedState, districtCode);
          return;
        }
      }

      // Check if clicked on a weather marker
      const markerFeatures = map.queryRenderedFeatures(e.point, { layers: ['weather-markers'] });
      if (markerFeatures.length > 0) {
        const geometry = markerFeatures[0].geometry;
        if (geometry.type === 'Point') {
          const coords = geometry.coordinates;
          const markerCoords: [number, number] = [coords[0], coords[1]];
          const name = markerFeatures[0].properties?.name as string;
          handleMarkerClick(map, { lat: markerCoords[1], lon: markerCoords[0] }, name);
          return;
        }
      }

      // Default: click anywhere on map - show coordinates
      setClickedCoords(coords);
      const source = map.getSource('clicked-location') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [coords.lon, coords.lat] },
            properties: {
              coords: formatCoordinates(coords),
              name: 'Clicked Location',
            },
          }],
        });
      }

      if (onMapClick) {
        onMapClick(coords);
      } else {
        setSelectedLocation(coords, formatCoordinates(coords));
      }
    });

    // Right click - reset clicked location
    map.on('contextmenu', (e: MapMouseEvent) => {
      e.preventDefault();
      setClickedCoords(null);
      const source = map.getSource('clicked-location') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    });

    // Hover popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      className: 'geo-map-popup',
    });
    popupRef.current = popup;

    // Hover effects with rich tooltip
    map.on('mousemove', (e: MapMouseEvent) => {
      const markerFeatures = map.queryRenderedFeatures(e.point, { layers: ['weather-markers'] });
      const stateFeatures = map.queryRenderedFeatures(e.point, { layers: ['states-fill-extrusion'] });

      if (markerFeatures.length > 0 && markerFeatures[0].geometry.type === 'Point') {
        map.getCanvas().style.cursor = 'pointer';
        const props = markerFeatures[0].properties;
        const coords = (markerFeatures[0].geometry as GeoJSON.Point).coordinates;
        const tempText = props?.temperature != null ? `${Math.round(props.temperature)}°C` : 'N/A';
        const humText = props?.humidity != null ? ` • ${props.humidity}% RH` : '';
        
        popup.setLngLat([coords[0], coords[1]])
          .setHTML(`
            <div style="background:#171717; color:#F5F5F5; padding:8px 12px; border-radius:4px; border:1px solid #2A2A2A; font-family:Inter,sans-serif; box-shadow:0 8px 24px rgba(0,0,0,0.7);">
              <div style="font-weight:600; font-size:12px; color:#E7B75A; margin-bottom:2px;">${props?.name || 'City'}</div>
              <div style="font-size:11px; color:#737373;">${props?.state || ''}</div>
              <div style="display:flex; align-items:baseline; gap:6px; margin-top:4px; font-family:'JetBrains Mono',monospace;">
                <span style="font-size:15px; font-weight:700; color:#F5F5F5;">${tempText}</span>
                <span style="font-size:10px; color:#A3A3A3;">${humText}</span>
              </div>
            </div>
          `)
          .addTo(map);
        return;
      }

      if (stateFeatures.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        const props = stateFeatures[0].properties;
        const tempText = props?.temperature != null ? `${Math.round(props.temperature)}°C` : '';
        
        popup.setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#171717; color:#F5F5F5; padding:6px 10px; border-radius:4px; border:1px solid #2A2A2A; font-family:Inter,sans-serif; font-size:11px; box-shadow:0 4px 12px rgba(0,0,0,0.6);">
              <span style="font-weight:600; color:#E7B75A;">${props?.name || props?.code || 'State'}</span>
              ${tempText ? `<span style="margin-left:6px; font-weight:700; color:#F5F5F5; font-family:'JetBrains Mono',monospace;">${tempText}</span>` : ''}
            </div>
          `)
          .addTo(map);
        return;
      }

      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    map.on('mouseleave', 'weather-markers', () => {
      popup.remove();
    });
    map.on('mouseleave', 'states-fill-extrusion', () => {
      popup.remove();
    });

    // Viewport change
    map.on('moveend', () => {
      const center = map.getCenter();
      setViewport({
        center: { lat: center.lat, lon: center.lng },
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    });
  }, [navigationLevel, selectedState, setViewport, onMapClick]);

  // Handle state click
  const handleStateClick = useCallback((map: Map, stateCode: string) => {
    const bounds = getStateBounds(stateCode);
    if (bounds) {
      map.fitBounds([
        [bounds.bounds.minLon, bounds.bounds.minLat],
        [bounds.bounds.maxLon, bounds.bounds.maxLat],
      ], { padding: 50, duration: 1000 });
      const sampledState = useAppStore.getState().indiaOverview?.states.find((state) => state.code === stateCode);
      setSelectedLocation(sampledState?.center ?? bounds.center, sampledState?.sampledCity || `${stateCode} State`);
    }
    useAppStore.getState().setNavigationLevel('state');
    useAppStore.getState().setSelectedState(stateCode);
    useAppStore.getState().setSelectedDistrict(null);
  }, [setSelectedLocation]);

  // Handle district click
  const handleDistrictClick = useCallback((map: Map, stateCode: string, districtCode: string) => {
    useAppStore.getState().setNavigationLevel('district');
    useAppStore.getState().setSelectedDistrict(districtCode);
  }, []);

  // Handle marker click
  const handleMarkerClick = useCallback((map: Map, coords: Coordinates, name: string) => {
    map.flyTo({ center: [coords.lon, coords.lat], zoom: 9, duration: 1000 });
    setSelectedLocation(coords, name);
    useAppStore.getState().setNavigationLevel('city');
  }, [setSelectedLocation]);

  // Update viewport when store changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current) return;

    const currentCenter = map.getCenter();
    const targetCenter: [number, number] = [viewport.center.lon, viewport.center.lat];

    const distance = Math.hypot(currentCenter.lng - targetCenter[0], currentCenter.lat - targetCenter[1]);
    if (distance > 0.01) {
      map.flyTo({
        center: targetCenter,
        zoom: viewport.zoom,
        bearing: viewport.bearing,
        pitch: viewport.pitch,
        duration: 1500,
      });
    }
  }, [viewport]);

  // Memoize city markers with real weather data
  const cityMarkers = useMemo(() => {
    const features: GeoJSON.Feature[] = [];
    const mappedNames = new Set<string>();
    
    INDIA_CITIES.forEach((city) => {
      mappedNames.add(city.name);
      // Try to get real data from Cassandra first
      const cassandraData = cassandraLatestMap?.[city.name];
      const hasRealData = cassandraData && cassandraData.temperature != null;
      
      const temp = hasRealData ? cassandraData.temperature : null;
      const humidity = hasRealData ? cassandraData.humidity : null;
      const precipitation = hasRealData ? cassandraData.precipitation : null;
      const windSpeed = hasRealData ? cassandraData.windSpeed : null;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [city.lon, city.lat] },
        properties: {
          name: city.name,
          state: city.state,
          stateCode: city.stateCode,
          temperature: temp,
          humidity,
          precipitation,
          windSpeed,
          tier: city.tier,
          population: city.population,
          isCapital: city.isCapital || false,
          type: hasRealData ? 'city-live' : city.tier === 1 ? 'tier1-city' : city.tier === 2 ? 'tier2-city' : 'tier3-city',
        },
      });
    });

    // The static map catalog is only for presentation. Show every stored point,
    // including monitored cities that were added to the ingest registry later.
    Object.entries(cassandraLatestMap ?? {}).forEach(([name, observation]) => {
      if (mappedNames.has(name) || !Number.isFinite(observation.latitude) || !Number.isFinite(observation.longitude)) return;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [observation.longitude, observation.latitude] },
        properties: {
          name,
          temperature: observation.temperature,
          humidity: observation.humidity,
          precipitation: observation.precipitation,
          windSpeed: observation.windSpeed,
          type: 'city-live',
        },
      });
    });

    // Represent state-overview data at the actual state centre.
    if (indiaOverview?.states) {
      indiaOverview.states.forEach((state: typeof indiaOverview.states[0]) => {
        if (state.current) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [state.center.lon, state.center.lat] },
            properties: {
              name: state.name,
              temperature: state.current.temperature,
              humidity: state.current.humidity,
              windSpeed: state.current.windSpeed,
              precipitation: state.current.precipitation,
              type: 'state-centre-live',
            },
          });
        }
      });
    }

    // Override with live data from state districts
    if (stateDistricts) {
      stateDistricts.forEach((district: typeof stateDistricts[0]) => {
        if (district.current) {
          const cityFeature = features.find(f => 
            f.properties?.name === district.name && f.properties?.type?.includes('city')
          );
          if (cityFeature && cityFeature.properties) {
            cityFeature.properties.temperature = district.current.temperature;
            cityFeature.properties.humidity = district.current.humidity;
            cityFeature.properties.windSpeed = district.current.windSpeed;
            cityFeature.properties.precipitation = district.current.precipitation;
            cityFeature.properties.type = 'district-live';
            cityFeature.properties.stateCode = district.stateCode;
          } else {
            features.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [district.center.lon, district.center.lat] },
              properties: {
                name: district.name,
                temperature: district.current.temperature,
                humidity: district.current.humidity,
                windSpeed: district.current.windSpeed,
                precipitation: district.current.precipitation,
                type: 'district-live',
                stateCode: district.stateCode,
              },
            });
          }
        }
      });
    }

    // Add selected location marker
    if (selectedLocation && weatherData?.current) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [selectedLocation.lon, selectedLocation.lat] },
        properties: {
          name: weatherData.locationName,
          temperature: weatherData.current.temperature,
          humidity: weatherData.current.humidity,
          windSpeed: weatherData.current.windSpeed,
          precipitation: weatherData.current.precipitation,
          type: 'selected',
        },
      });
    }

    return features;
  }, [indiaOverview, stateDistricts, selectedLocation, weatherData, cassandraLatestMap]);

  // Update weather markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current) return;

    const source = map.getSource('weather-markers') as maplibregl.GeoJSONSource;
    if (!source) return;

    source.setData({ type: 'FeatureCollection', features: cityMarkers });
  }, [cityMarkers, isMapLoaded]);

  // Update selected location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current) return;

    const source = map.getSource('selected-location') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (selectedLocation) {
      source.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [selectedLocation.lon, selectedLocation.lat] },
          properties: {
            name: weatherData?.locationName || 'Selected',
          },
        }],
      });
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [selectedLocation, weatherData?.locationName]);

  // Update state polygons with temperature data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current) return;

    const source = map.getSource('states') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (!indiaOverview?.states) return;
    let cancelled = false;
    fetch(statesGeoJSONUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`State boundary request failed: ${response.status}`);
        return response.json() as Promise<GeoJSON.FeatureCollection>;
      })
      .then((geojson) => {
        if (cancelled) return;
        const updatedFeatures = geojson.features.map((feature) => {
          const stateData = indiaOverview.states.find((state) => state.code === feature.properties?.code);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              temperature: stateData?.current?.temperature ?? null,
              humidity: stateData?.current?.humidity ?? null,
              alertLevel: stateData?.alertLevel ?? 'none',
            },
          };
        });
        source.setData({ type: 'FeatureCollection', features: updatedFeatures });
      })
      .catch((error) => console.error('Unable to load state boundaries', error));
    return () => { cancelled = true; };
  }, [indiaOverview, mapStyle]);

  // Update district polygons with temperature data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current || !stateDistricts) return;

    const source = map.getSource('districts') as maplibregl.GeoJSONSource;
    if (!source) return;

    let cancelled = false;
    const weatherByCode = new globalThis.Map(stateDistricts.map((district) => [district.code, district]));
    fetch(indiaDistrictsGeoJSONUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`District boundary request failed: ${response.status}`);
        return response.json() as Promise<GeoJSON.FeatureCollection>;
      })
      .then((geojson) => {
        if (cancelled) return;
        const features = geojson.features.map((feature) => {
          const district = weatherByCode.get(feature.properties?.code as string);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              temperature: district?.current?.temperature ?? null,
              alertLevel: district?.alertLevel ?? 'none',
            },
          };
        });
        source.setData({ type: 'FeatureCollection', features });
      })
      .catch((error) => console.warn('Unable to apply district weather overlay:', error));

    return () => { cancelled = true; };
  }, [stateDistricts]);

  // Animate pulse layer for selected location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current || !selectedLocation) return;

    const animatePulse = () => {
      const layer = map.getLayer('selected-location-pulse');
      if (!layer) return;

      const time = Date.now() / 1000;
      const radius = 18 + Math.sin(time * 2) * 6;
      const opacity = 0.2 + Math.sin(time * 2) * 0.15;

      map.setPaintProperty('selected-location-pulse', 'circle-radius', radius);
      map.setPaintProperty('selected-location-pulse', 'circle-opacity', opacity);

      animationFrameRef.current = requestAnimationFrame(animatePulse);
    };

    animatePulse();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedLocation]);

  // Animate clicked location pulse
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded.current || !clickedCoords) return;

    const animatePulse = () => {
      const layer = map.getLayer('clicked-location-pulse');
      if (!layer) return;

      const time = Date.now() / 1000;
      const radius = 16 + Math.sin(time * 3) * 6;
      const opacity = 0.3 + Math.sin(time * 3) * 0.2;

      map.setPaintProperty('clicked-location-pulse', 'circle-radius', radius);
      map.setPaintProperty('clicked-location-pulse', 'circle-opacity', opacity);

      animationFrameRef.current = requestAnimationFrame(animatePulse);
    };

    animatePulse();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [clickedCoords]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export default MapContainer;
