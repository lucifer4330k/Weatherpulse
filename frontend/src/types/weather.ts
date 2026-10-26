// Weather Data Types

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  feels_like?: number;
  humidity: number;
  windSpeed: number;
  wind_speed?: number;
  windDirection: number;
  wind_direction?: number;
  windDirectionText: string;
  wind_direction_text?: string;
  precipitation: number;
  pressure: number;
  weatherCode: number;
  weather_code?: number;
  weatherDescription: string;
  weather_description?: string;
  isDay: boolean;
  is_day?: boolean;
  time: string; // ISO timestamp
  source: 'open-meteo' | 'cassandra' | 'mixed';
  visibility?: number;
  cloudCover?: number;
  cloud_cover?: number;
  uvIndex?: number;
  uv_index?: number;
  latitude?: number;
  longitude?: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  feelsLike: number;
  feels_like?: number;
  humidity: number;
  windSpeed: number;
  wind_speed?: number;
  windDirection: number;
  wind_direction?: number;
  windDirectionText: string;
  wind_direction_text?: string;
  precipitation: number;
  precipitationProbability: number;
  precipitation_probability?: number;
  weatherCode: number;
  weather_code?: number;
  weatherDescription: string;
  weather_description?: string;
  pressure: number;
  cloudCover: number;
  cloud_cover?: number;
  visibility: number;
  uvIndex: number;
  uv_index?: number;
}

export interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  feelsLikeMax: number;
  feelsLikeMin: number;
  humidity: number;
  windSpeedMax: number;
  windDirectionDominant: number;
  windDirectionText?: string;
  wind_direction_text?: string;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  weatherCode: number;
  weather_code?: number;
  weatherDescription: string;
  weather_description?: string;
  pressure: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAlert {
  id: string;
  type: 'temperature' | 'precipitation' | 'wind' | 'pressure' | 'uv';
  severity: 'info' | 'warning' | 'severe' | 'extreme';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  unit: string;
  startTime: string;
  endTime?: string;
  regions: string[];
}

export interface HistoricalDataPoint {
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  precipitation: number;
  source: 'cassandra' | 'open-meteo';
}

export interface WeatherTrends {
  location: Coordinates;
  locationName: string;
  period: '7d' | '30d' | '90d' | '1y';
  temperature: {
    min: number;
    max: number;
    avg: number;
    data: HistoricalDataPoint[];
  };
  precipitation: {
    total: number;
    avg: number;
    data: HistoricalDataPoint[];
  };
  humidity: {
    avg: number;
    data: HistoricalDataPoint[];
  };
}

export interface WeatherDashboardData {
  location: Coordinates;
  locationName: string;
  current: CurrentWeather | null;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  trends: WeatherTrends | null;
  alerts: WeatherAlert[];
  lastUpdated: string;
  dataSource: 'open-meteo' | 'cassandra' | 'mixed';
  isLoading: boolean;
  error: string | null;
}

// Geocoding Types
export interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  featureCode: string;
  countryCode: string;
  admin1Id: number;
  admin2Id: number;
  admin3Id: number;
  admin4Id: number;
  timezone: string;
  population: number;
  postcodes: string[];
  country: string;
  admin1: string; // State
  admin2: string; // District
  admin3?: string;
  admin4?: string;
}

export interface GeocodeResponse {
  results: GeocodeResult[];
  generationTime: number;
}

// Map Types
export interface MapViewport {
  center: Coordinates;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface MapLayer {
  id: string;
  type: 'fill' | 'line' | 'symbol' | 'circle' | 'fill-extrusion';
  source: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  filter?: unknown[];
}

export interface IndiaState {
  code: string;
  name: string;
  bounds: BoundingBox;
  center: Coordinates;
  districtCount: number;
}

export interface IndiaDistrict {
  code: string;
  name: string;
  stateCode: string;
  bounds: BoundingBox;
  center: Coordinates;
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  timestamp: string;
}

export interface IndiaOverviewResponse {
  states: StateWeatherSummary[];
  national: {
    avgTemperature: number;
    avgHumidity: number;
    totalPrecipitation: number;
    alertCount: number;
  };
  timestamp: string;
}

export interface StateWeatherSummary {
  code: string;
  name: string;
  center: Coordinates;
  bounds: BoundingBox;
  current: CurrentWeather | null;
  alertLevel: 'none' | 'low' | 'moderate' | 'high' | 'extreme';
  districtCount: number;
}

export interface DistrictWeatherSummary {
  code: string;
  name: string;
  stateCode: string;
  center: Coordinates;
  bounds: BoundingBox;
  current: CurrentWeather | null;
  alertLevel: 'none' | 'low' | 'moderate' | 'high' | 'extreme';
}

// Store Types
export interface AppState {
  // Map state
  viewport: MapViewport;
  selectedLocation: Coordinates | null;
  selectedLocationName: string | null;
  navigationLevel: 'india' | 'state' | 'district' | 'city';
  selectedState: string | null;
  selectedDistrict: string | null;

  // UI state
  isDashboardOpen: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: GeocodeResult[];

  // Data state
  weatherData: WeatherDashboardData | null;
  indiaOverview: IndiaOverviewResponse | null;
  stateDistricts: DistrictWeatherSummary[] | null;

  // Actions
  setViewport: (viewport: Partial<MapViewport>) => void;
  setSelectedLocation: (location: Coordinates | null, name?: string) => void;
  setNavigationLevel: (level: 'india' | 'state' | 'district' | 'city') => void;
  setSelectedState: (stateCode: string | null) => void;
  setSelectedDistrict: (districtCode: string | null) => void;
  toggleDashboard: (open?: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: GeocodeResult[]) => void;
  setWeatherData: (data: WeatherDashboardData | null) => void;
  setIndiaOverview: (data: IndiaOverviewResponse | null) => void;
  setStateDistricts: (data: DistrictWeatherSummary[] | null) => void;
  flyToIndia: () => void;
  reset: () => void;
}
