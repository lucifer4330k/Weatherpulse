import { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAppStore, useIsDashboardOpen, useSelectedLocationName, useSelectedLocation, useWeatherData } from '../../store/useAppStore';
import { useDashboardData } from '../../hooks/useWeather';
import { CurrentConditions } from './CurrentConditions';
import { Forecast } from './Forecast';
import { HistoricalCharts } from './HistoricalCharts';
import { Alerts } from './Alerts';
import { DataFreshness } from './DataFreshness';

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
    { id: 'current', label: 'Current' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'historical', label: 'History' },
    { id: 'alerts', label: 'Alerts', count: weatherData?.alerts?.length || 0 },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm -z-10 transition-opacity"
        onClick={() => closeDashboard(false)}
        aria-hidden="true"
      />

      {/* Main Panel */}
      <div className="h-full w-full flex flex-col bg-[#090909] border-l border-[#2A2A2A] shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="h-14 px-4 bg-[#101010] border-b border-[#2A2A2A] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center flex-shrink-0 text-[#E7B75A] font-mono font-bold text-xs">
              {locationName ? locationName.slice(0, 2).toUpperCase() : 'IN'}
            </div>
            <div className="min-w-0">
              <h2 className="text-[#F5F5F5] font-medium text-sm truncate tracking-tight">{locationName || 'Station Telemetry'}</h2>
              <p className="text-[#737373] text-[10px] font-mono truncate">Real-time Weather Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
              aria-label="Refresh weather data"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => closeDashboard(false)}
              className="p-1.5 rounded text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
              aria-label="Close dashboard"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 py-2 bg-[#0C0C0C] border-b border-[#2A2A2A] flex items-center gap-1.5 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/40'
                  : 'text-[#737373] hover:text-[#F5F5F5] border border-transparent'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1 py-0.2 rounded bg-[#D9534F]/20 text-[#D9534F] text-[9px] font-bold border border-[#D9534F]/30">
                  {tab.count > 9 ? '9+' : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {isActuallyLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 font-mono">
              <div className="w-8 h-8 border-2 border-[#E7B75A] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#A3A3A3] text-xs">Connecting to meteorological pipeline...</p>
              <p className="text-[#737373] text-[10px]">Querying Cassandra & Open-Meteo</p>
            </div>
          ) : error && !weatherData ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-4 font-mono">
              <div className="w-10 h-10 rounded bg-[#D9534F]/10 border border-[#D9534F]/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#D9534F]" />
              </div>
              <h3 className="text-[#F5F5F5] font-medium text-xs">Pipeline Ingest Interrupted</h3>
              <p className="text-[#737373] text-[11px] max-w-xs">{error instanceof Error ? error.message : 'Error fetching telemetry data'}</p>
              <button
                onClick={() => refetch()}
                className="mt-2 px-3 py-1.5 rounded bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/40 hover:bg-[#202020] text-xs transition-colors font-mono"
              >
                Retry Ingest
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

          {/* Telemetry and Freshness footer */}
          {weatherData && <DataFreshness data={weatherData} />}
        </div>
      </div>
    </div>
  );
}

export default WeatherDashboard;