import { create } from 'zustand';
import type {
  AppState,
  MapViewport,
  Coordinates,
  GeocodeResult,
  WeatherDashboardData,
  IndiaOverviewResponse,
  DistrictWeatherSummary,
} from '../types';

const DEFAULT_VIEWPORT: MapViewport = {
  center: { lat: 21.0, lon: 78.9629 }, // Center of India (frames Kashmir to Kanyakumari)
  zoom: 4.6,
  bearing: 0,
  pitch: 38,
};

const initialState: Omit<AppState, keyof Pick<AppState, 'setViewport' | 'setSelectedLocation' | 'setNavigationLevel' | 'setSelectedState' | 'setSelectedDistrict' | 'toggleDashboard' | 'setSearchQuery' | 'setSearchResults' | 'setWeatherData' | 'setIndiaOverview' | 'setStateDistricts' | 'reset' | 'flyToIndia'>> = {
  viewport: DEFAULT_VIEWPORT,
  selectedLocation: null,
  selectedLocationName: null,
  navigationLevel: 'india',
  selectedState: null,
  selectedDistrict: null,
  isDashboardOpen: false,
  isSearchOpen: false,
  searchQuery: '',
  searchResults: [],
  weatherData: null,
  indiaOverview: null,
  stateDistricts: null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setViewport: (viewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    })),

  setSelectedLocation: (location, name) =>
    set({
      selectedLocation: location,
      selectedLocationName: name ?? null,
      isDashboardOpen: location !== null,
    }),

  setNavigationLevel: (level) =>
    set({ navigationLevel: level }),

  setSelectedState: (stateCode) =>
    set({ selectedState: stateCode }),

  setSelectedDistrict: (districtCode) =>
    set({ selectedDistrict: districtCode }),

  toggleDashboard: (open) =>
    set((state) => ({
      isDashboardOpen: open ?? !state.isDashboardOpen,
    })),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  setSearchResults: (results) =>
    set({ searchResults: results, isSearchOpen: results.length > 0 }),

  setWeatherData: (data) =>
    set({ weatherData: data }),

  setIndiaOverview: (data) =>
    set({ indiaOverview: data }),

  setStateDistricts: (data) =>
    set({ stateDistricts: data }),

  flyToIndia: () =>
    set({
      viewport: DEFAULT_VIEWPORT,
      navigationLevel: 'india',
      selectedState: null,
      selectedDistrict: null,
    }),

  reset: () => set(initialState),
}));

// Selectors for performance
export const useViewport = () => useAppStore((state) => state.viewport);
export const useSelectedLocation = () => useAppStore((state) => state.selectedLocation);
export const useSelectedLocationName = () => useAppStore((state) => state.selectedLocationName);
export const useNavigationLevel = () => useAppStore((state) => state.navigationLevel);
export const useSelectedState = () => useAppStore((state) => state.selectedState);
export const useSelectedDistrict = () => useAppStore((state) => state.selectedDistrict);
export const useIsDashboardOpen = () => useAppStore((state) => state.isDashboardOpen);
export const useWeatherData = () => useAppStore((state) => state.weatherData);
export const useIndiaOverview = () => useAppStore((state) => state.indiaOverview);
export const useStateDistricts = () => useAppStore((state) => state.stateDistricts);
export const useSearchQuery = () => useAppStore((state) => state.searchQuery);
export const useSearchResults = () => useAppStore((state) => state.searchResults);
export const useIsSearchOpen = () => useAppStore((state) => state.isSearchOpen);
export const useFlyToIndia = () => useAppStore((state) => state.flyToIndia);