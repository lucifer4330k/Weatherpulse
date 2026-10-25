import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, RefreshCw, Loader2, AlertTriangle, Info } from 'lucide-react';
import { useAppStore, useIsDashboardOpen, useSelectedLocationName, useSelectedLocation, useWeatherData } from '../../store/useAppStore';
import { useDashboardData } from '../../hooks/useWeather';
import { CurrentConditions } from './CurrentConditions';
import { Forecast } from './Forecast';
import { HistoricalCharts } from './HistoricalCharts';
import { Alerts } from './Alerts';
import { DataFreshness } from './DataFreshness';
import type { WeatherDashboardData } from '../../types';

export function WeatherDashboard() {
  const isOpen = useIsDashboardOpen();
  const locationName = useSelectedLocationName();
  const selectedLocation = useSelectedLocation();
  const storeWeatherData = useWeatherData();
  const setWeatherData = useAppStore((state) => state.setWeatherData);
  const closeDashboard = useAppStore((state) => state.toggleDashboard);
  const [activeTab, setActiveTab] = useState<'current' | 'forecast' | 'historical' | 'alerts'>('current');

  const { data: fetchedData, isLoading, error, refetch } = useDashboardData(selectedLocation, locationName, isOpen);

  useEffect(() => {
    if (fetchedData) {
      setWeatherData(fetchedData);
    }
  }, [fetchedData, setWeatherData]);

  useEffect(() => {
    const handleRefresh = () => {
      refetch();
    };
    window.addEventListener('refresh-weather', handleRefresh);
    return () => window.removeEventListener('refresh-weather', handleRefresh);
  }, [refetch]);

  if (!isOpen) return null;

  const weatherData = fetchedData || storeWeatherData;
  const isActuallyLoading = isLoading && !weatherData;

  const tabs = [
    { id: 'current', label: 'Current', icon: null },
    { id: 'forecast', label: 'Forecast', icon: null },
    { id: 'historical', label: 'History', icon: null },
    { id: 'alerts', label: 'Alerts', icon: null, count: weatherData?.alerts?.length || 0 },
  ];

  return (
    <div className="dashboard-panel animate-slide-in-right">
      {/* Backdrop */}
      <div
        className="dashboard-backdrop"
        onClick={() => closeDashboard(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="h-full flex flex-col elevation-5 border-l border-neutral-800/50">
        {/* Header */}
        <div className="dashboard-header flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/25">
              <span className="text-white font-bold text-lg">
                {locationName?.charAt(0).toUpperCase() || '📍'}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-semibold text-base truncate">{locationName || 'Weather Details'}</h2>
              <p className="text-neutral-500 text-xs truncate">Live weather & historical analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => refetch()}
              className="btn-icon btn-ghost hover:bg-neutral-800/50"
              aria-label="Refresh weather data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => closeDashboard(false)}
              className="btn-icon btn-ghost hover:bg-neutral-800/50"
              aria-label="Close dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-list px-4 pb-3 border-b border-neutral-800/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="tab"
              data-state={activeTab === tab.id ? 'active' : 'inactive'}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] flex items-center justify-center font-bold">
                  {tab.count > 9 ? '9+' : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="dashboard-content">
          {isActuallyLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-neutral-400 text-sm">Loading weather data...</p>
              <p className="text-neutral-600 text-xs">Fetching latest conditions</p>
            </div>
          ) : error && !weatherData ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-white font-semibold">Unable to load weather data</h3>
              <p className="text-neutral-500 text-sm">{error instanceof Error ? error.message : 'Error fetching data'}</p>
              <button
                onClick={() => refetch()}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'current' && <CurrentConditions data={weatherData} />}
              {activeTab === 'forecast' && <Forecast data={weatherData} />}
              {activeTab === 'historical' && <HistoricalCharts data={weatherData} />}
              {activeTab === 'alerts' && <Alerts data={weatherData} />}
            </>
          )}

          {/* Data Freshness - always shown at bottom */}
          {weatherData && <DataFreshness data={weatherData} />}
        </div>
      </div>
    </div>
  );
}

export default WeatherDashboard;