import type {
  Coordinates,
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  WeatherAlert,
  WeatherTrends,
  GeocodeResult,
  IndiaOverviewResponse,
  StateWeatherSummary,
  DistrictWeatherSummary,
  WeatherDashboardData,
} from '../types';

export type { GeocodeResult };

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Convert the FastAPI snake_case JSON contract once, at the API boundary. */
function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamelCase);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        toCamelCase(nested),
      ])
    );
  }
  return value;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
    throw new ApiError(response.status, error?.detail || error?.message || `Request failed with HTTP ${response.status}`);
  }

  return toCamelCase(await response.json()) as T;
}

// Geocoding
export async function geocode(query: string, limit = 10): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    country: 'IN', // Restrict to India
  });
  return fetchApi<GeocodeResult[]>(`/geocode?${params.toString()}`);
}

// Current Weather
export async function getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  return fetchApi<CurrentWeather>(`/weather/current?lat=${lat}&lon=${lon}`);
}

// Forecast
export async function getForecast(
  lat: number,
  lon: number,
  options?: { hours?: number; days?: number }
): Promise<{ hourly: HourlyForecast[]; daily: DailyForecast[] }> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    hours: (options?.hours || 48).toString(),
    days: (options?.days || 7).toString(),
  });
  return fetchApi<{ hourly: HourlyForecast[]; daily: DailyForecast[] }>(`/weather/forecast?${params.toString()}`);
}

// Historical
export async function getHistoricalWeather(
  lat: number,
  lon: number,
  days = 30
): Promise<WeatherTrends> {
  return fetchApi<WeatherTrends>(`/weather/historical?lat=${lat}&lon=${lon}&days=${days}`);
}

// Alerts
export async function getWeatherAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
  return fetchApi<WeatherAlert[]>(`/weather/alerts?lat=${lat}&lon=${lon}`);
}

// India Overview
export async function getIndiaOverview(): Promise<IndiaOverviewResponse> {
  return fetchApi<IndiaOverviewResponse>('/india/overview');
}

// State Weather
export async function getStateWeather(stateCode: string): Promise<StateWeatherSummary> {
  return fetchApi<StateWeatherSummary>(`/india/state/${stateCode}`);
}

// Districts in State
export async function getStateDistricts(stateCode: string): Promise<DistrictWeatherSummary[]> {
  return fetchApi<DistrictWeatherSummary[]>(`/india/state/${stateCode}/districts`);
}

// Complete Dashboard Data (single call for convenience)
export async function getDashboardData(lat: number, lon: number, locationName: string): Promise<WeatherDashboardData> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    name: locationName,
  });
  return fetchApi<WeatherDashboardData>(`/weather/dashboard?${params.toString()}`);
}

// Cassandra Historical
export async function getCassandraHistorical(city: string, days = 30): Promise<WeatherTrends> {
  return fetchApi<WeatherTrends>(`/cassandra/historical?city=${encodeURIComponent(city)}&days=${days}`);
}

// Cassandra Latest
export async function getCassandraLatest(city: string): Promise<CurrentWeather> {
  return fetchApi<CurrentWeather>(`/cassandra/latest?city=${encodeURIComponent(city)}`);
}

export interface CassandraLatestObservation {
  stationId: string;
  timestamp: string;
  sourceTimestamp?: string;
  ingestedAt?: string;
  source?: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  weatherCondition: string;
}

export async function getCassandraLatestBatch(cities: string[]): Promise<Record<string, CassandraLatestObservation>> {
  const params = new URLSearchParams();
  cities.forEach((city) => params.append('cities', city));
  const response = await fetchApi<{ observations: Record<string, CassandraLatestObservation> }>(`/cassandra/latest/batch?${params}`);
  return response.observations;
}

// Cassandra Cities
export async function getCassandraCities(): Promise<{ cities: string[]; count: number }> {
  return fetchApi<{ cities: string[]; count: number }>('/cassandra/cities');
}

// Health Check
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return fetchApi<{ status: string; timestamp: string }>('/health');
}

export { ApiError };
