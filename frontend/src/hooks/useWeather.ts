import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  getCurrentWeather,
  getForecast,
  getHistoricalWeather,
  getWeatherAlerts,
  getDashboardData,
  getIndiaOverview,
  getStateWeather,
  getStateDistricts,
  getCassandraHistorical,
  getCassandraLatest,
  getCassandraLatestBatch,
  getCassandraCities,
  healthCheck,
} from '../services/api';
import type { Coordinates, WeatherDashboardData, IndiaOverviewResponse, StateWeatherSummary, DistrictWeatherSummary, WeatherTrends, WeatherAlert } from '../types';
import type { CassandraLatestObservation } from '../services/api';

// Query Keys
export const weatherKeys = {
  all: ['weather'] as const,
  current: (coords: Coordinates) => [...weatherKeys.all, 'current', coords.lat, coords.lon] as const,
  forecast: (coords: Coordinates, hours?: number, days?: number) => [...weatherKeys.all, 'forecast', coords.lat, coords.lon, hours, days] as const,
  historical: (coords: Coordinates, days?: number) => [...weatherKeys.all, 'historical', coords.lat, coords.lon, days] as const,
  alerts: (coords: Coordinates) => [...weatherKeys.all, 'alerts', coords.lat, coords.lon] as const,
  dashboard: (coords: Coordinates, name: string) => [...weatherKeys.all, 'dashboard', coords.lat, coords.lon, name] as const,
  indiaOverview: () => [...weatherKeys.all, 'india', 'overview'] as const,
  state: (stateCode: string) => [...weatherKeys.all, 'india', 'state', stateCode] as const,
  stateDistricts: (stateCode: string) => [...weatherKeys.all, 'india', 'state', stateCode, 'districts'] as const,
  cassandraHistorical: (city: string, days?: number) => [...weatherKeys.all, 'cassandra', 'historical', city, days] as const,
  cassandraLatest: (city: string) => [...weatherKeys.all, 'cassandra', 'latest', city] as const,
  cassandraCities: () => [...weatherKeys.all, 'cassandra', 'cities'] as const,
  health: () => [...weatherKeys.all, 'health'] as const,
};

// Current Weather Hook
export function useCurrentWeather(coords: Coordinates | null, enabled = true) {
  return useQuery(
    coords ? weatherKeys.current(coords) : ['weather', 'current', 'disabled'],
    () => getCurrentWeather(coords!.lat, coords!.lon),
    {
      enabled: enabled && coords !== null,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
}

// Forecast Hook
export function useForecast(coords: Coordinates | null, options?: { hours?: number; days?: number }, enabled = true) {
  return useQuery(
    coords ? weatherKeys.forecast(coords, options?.hours, options?.days) : ['weather', 'forecast', 'disabled'],
    () => getForecast(coords!.lat, coords!.lon, options),
    {
      enabled: enabled && coords !== null,
      staleTime: 30 * 60 * 1000, // 30 minutes
    }
  );
}

// Historical Weather Hook
export function useHistoricalWeather(coords: Coordinates | null, days = 30, enabled = true) {
  return useQuery(
    coords ? weatherKeys.historical(coords, days) : ['weather', 'historical', 'disabled'],
    () => getHistoricalWeather(coords!.lat, coords!.lon, days),
    {
      enabled: enabled && coords !== null,
      staleTime: 60 * 60 * 1000, // 1 hour
    }
  );
}

// Alerts Hook
export function useWeatherAlerts(coords: Coordinates | null, enabled = true) {
  return useQuery(
    coords ? weatherKeys.alerts(coords) : ['weather', 'alerts', 'disabled'],
    () => getWeatherAlerts(coords!.lat, coords!.lon),
    {
      enabled: enabled && coords !== null,
      staleTime: 15 * 60 * 1000, // 15 minutes
    }
  );
}

// Complete Dashboard Data Hook
export function useDashboardData(coords: Coordinates | null, locationName: string | null, enabled = true) {
  return useQuery(
    coords && locationName ? weatherKeys.dashboard(coords, locationName) : ['weather', 'dashboard', 'disabled'],
    () => getDashboardData(coords!.lat, coords!.lon, locationName!),
    {
      enabled: enabled && coords !== null && locationName !== null,
      staleTime: 10 * 60 * 1000,
    }
  );
}

// India Overview Hook
export function useIndiaOverview(enabled = true) {
  return useQuery(
    weatherKeys.indiaOverview(),
    getIndiaOverview,
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

// State Weather Hook
export function useStateWeather(stateCode: string | null, enabled = true) {
  return useQuery(
    stateCode ? weatherKeys.state(stateCode) : ['weather', 'state', 'disabled'],
    () => getStateWeather(stateCode!),
    {
      enabled: enabled && stateCode !== null,
      staleTime: 10 * 60 * 1000,
    }
  );
}

// State Districts Hook
export function useStateDistricts(stateCode: string | null, enabled = true) {
  return useQuery(
    stateCode ? weatherKeys.stateDistricts(stateCode) : ['weather', 'stateDistricts', 'disabled'],
    () => getStateDistricts(stateCode!),
    {
      enabled: enabled && stateCode !== null,
      staleTime: 10 * 60 * 1000,
    }
  );
}

// Cassandra Historical Hook
export function useCassandraHistorical(city: string | null, days = 30, enabled = true) {
  return useQuery(
    city ? weatherKeys.cassandraHistorical(city, days) : ['weather', 'cassandra', 'disabled'],
    () => getCassandraHistorical(city!, days),
    {
      enabled: enabled && city !== null,
      staleTime: 60 * 60 * 1000,
    }
  );
}

// Cassandra Latest Hook
export function useCassandraLatest(city: string | null, enabled = true) {
  return useQuery(
    city ? weatherKeys.cassandraLatest(city) : ['weather', 'cassandra', 'latest', 'disabled'],
    () => getCassandraLatest(city!),
    {
      enabled: enabled && city !== null,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

// Cassandra Latest Multiple Cities Hook
function fetchCassandraLatestMultiple(cities: string[]): Promise<Record<string, CassandraLatestObservation>> {
  if (cities.length === 0) return Promise.resolve({});
  return getCassandraLatestBatch(cities).catch(() => ({}));
}

export function useCassandraLatestMultiple(cities: string[], enabled = true) {
  return useQuery(
    cities.length > 0 ? weatherKeys.cassandraLatest(cities.join(',')) : ['weather', 'cassandra', 'latest', 'disabled'],
    () => fetchCassandraLatestMultiple(cities),
    {
      enabled: enabled && cities.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

// Cassandra Cities Hook
export function useCassandraCities(enabled = true) {
  return useQuery(
    weatherKeys.cassandraCities(),
    () => getCassandraCities(),
    {
      enabled,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
}

// Health Check Hook
export function useHealthCheck() {
  return useQuery(
    weatherKeys.health(),
    healthCheck,
    {
      enabled: true,
      staleTime: 60 * 1000,
      retry: 3,
      retryDelay: 2000,
    }
  );
}

// Prefetch utilities
export function usePrefetchWeather() {
  const queryClient = useQueryClient();

  const prefetchDashboard = (coords: Coordinates, name: string) => {
    queryClient.prefetchQuery(
      weatherKeys.dashboard(coords, name),
      () => getDashboardData(coords.lat, coords.lon, name),
      { staleTime: 10 * 60 * 1000 }
    );
  };

  const prefetchIndiaOverview = () => {
    queryClient.prefetchQuery(
      weatherKeys.indiaOverview(),
      getIndiaOverview,
      { staleTime: 5 * 60 * 1000 }
    );
  };

  return { prefetchDashboard, prefetchIndiaOverview };
}

// Mutation for manual refresh
export function useRefreshWeather() {
  const queryClient = useQueryClient();

  const refreshDashboard = useMutation(
    async ({ coords, name }: { coords: Coordinates; name: string }) => {
      await queryClient.cancelQueries(weatherKeys.dashboard(coords, name));
      return getDashboardData(coords.lat, coords.lon, name);
    },
    {
      onSuccess: (data, variables) => {
        queryClient.setQueryData(weatherKeys.dashboard(variables.coords, variables.name), data);
      },
    }
  );

  const refreshIndiaOverview = useMutation(
    async () => {
      await queryClient.cancelQueries(weatherKeys.indiaOverview());
      return getIndiaOverview();
    },
    {
      onSuccess: (data) => {
        queryClient.setQueryData(weatherKeys.indiaOverview(), data);
      },
    }
  );

  return { refreshDashboard, refreshIndiaOverview };
}
