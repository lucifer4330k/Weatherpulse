import { useCallback } from 'react';
import { useAppStore, useViewport, useNavigationLevel, useSelectedState } from '../store/useAppStore';
import type { Coordinates } from '../types';
import { getStateBounds, getDistrictBounds } from '../services/mapUtils';

export function useMapNavigation() {
  const viewport = useViewport();
  const navigationLevel = useNavigationLevel();
  const selectedState = useSelectedState();

  const { setViewport, setSelectedLocation, setNavigationLevel, setSelectedState, setSelectedDistrict } = useAppStore();

  // Fly to a specific location
  const flyTo = useCallback((coords: Coordinates, zoom?: number) => {
    setViewport({
      center: coords,
      zoom: zoom ?? viewport.zoom,
    });
    // The actual flyTo will be handled by the Map component via useEffect
  }, [setViewport, viewport.zoom]);

  // Fly to India overview
  const flyToIndia = useCallback(() => {
    setViewport({
      center: { lat: 22.5937, lon: 78.9629 },
      zoom: 4,
      bearing: 0,
      pitch: 45,
    });
    setNavigationLevel('india');
    setSelectedState(null);
    setSelectedDistrict(null);
  }, [setViewport, setNavigationLevel, setSelectedState, setSelectedDistrict]);

  // Fly to state
  const flyToState = useCallback((stateCode: string) => {
    const bounds = getStateBounds(stateCode);
    if (bounds) {
      setViewport({ center: bounds.center, zoom: 5.5 });
    }
    setNavigationLevel('state');
    setSelectedState(stateCode);
    setSelectedDistrict(null);
  }, [setViewport, setNavigationLevel, setSelectedState, setSelectedDistrict]);

  // Fly to district
  const flyToDistrict = useCallback((stateCode: string, districtCode: string) => {
    const bounds = getDistrictBounds(stateCode);
    if (bounds) {
      setViewport({ center: bounds.center, zoom: 7.5 });
    }
    setNavigationLevel('district');
    setSelectedDistrict(districtCode);
  }, [setViewport, setNavigationLevel, setSelectedDistrict]);

  // Fly to city/point
  const flyToCity = useCallback((coords: Coordinates, name: string) => {
    flyTo(coords, 9);
    setSelectedLocation(coords, name);
    setNavigationLevel('city');
  }, [flyTo, setSelectedLocation, setNavigationLevel]);

  // Handle map click
  const handleMapClick = useCallback((coords: Coordinates) => {
    if (navigationLevel === 'india') {
      // Check if clicked on a state
      // This would need state boundary checking
      flyToCity(coords, 'Selected Location');
    } else if (navigationLevel === 'state' && selectedState) {
      // Check if clicked on a district
      flyToCity(coords, 'Selected Location');
    } else {
      // City level - just update dashboard
      flyToCity(coords, 'Selected Location');
    }
  }, [navigationLevel, selectedState, flyToCity]);

  return {
    viewport,
    flyTo,
    flyToIndia,
    flyToState,
    flyToDistrict,
    flyToCity,
    handleMapClick,
  };
}

export { getStateBounds, getDistrictBounds, STATE_BOUNDS } from '../services/mapUtils';
