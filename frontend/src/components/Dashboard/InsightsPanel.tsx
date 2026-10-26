import { useState, useMemo } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  Loader2, 
  AlertTriangle, 
  Info,
  MapPin,
  CloudRain, 
  Flame, 
  Snowflake, 
  Compass, 
  ArrowRight,
} from 'lucide-react';
import { useAppStore, useSelectedLocationName, useSelectedLocation, useSelectedState } from '../../store/useAppStore';
import { useDashboardData, useIndiaOverview as useIndiaOverviewQuery } from '../../hooks/useWeather';
import { CurrentConditions } from './CurrentConditions';
import { Forecast } from './Forecast';
import { HistoricalCharts } from './HistoricalCharts';
import { Alerts } from './Alerts';
import { DataFreshness } from './DataFreshness';
import type { StateWeatherSummary } from '../../types';

interface InsightsPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function InsightsPanel({ isCollapsed, onToggleCollapse }: InsightsPanelProps) {
  const locationName = useSelectedLocationName();
  const selectedLocation = useSelectedLocation();
  const selectedState = useSelectedState();
  const flyToIndia = useAppStore((state) => state.flyToIndia);
  const setSelectedLocation = useAppStore((state) => state.setSelectedLocation);
  const setSelectedState = useAppStore((state) => state.setSelectedState);
  const setNavigationLevel = useAppStore((state) => state.setNavigationLevel);

  const [activeTab, setActiveTab] = useState<'current' | 'forecast' | 'historical' | 'alerts'>('current');

  // Fetch location weather when selected
  const hasSelectedLocation = Boolean(selectedLocation && locationName);
  const { data: fetchedData, isLoading, error, refetch } = useDashboardData(
    selectedLocation, 
    locationName, 
    hasSelectedLocation
  );

  // Read India national overview
  const { data: overview } = useIndiaOverviewQuery();

  // Calculate National Leaderboards when no location selected
  const nationalLeaderboards = useMemo(() => {
    if (!overview?.states || overview.states.length === 0) return null;
    type StateWithCurrent = StateWeatherSummary & { current: NonNullable<StateWeatherSummary['current']> };
    const valid = overview.states.filter((s): s is StateWithCurrent => 
      Boolean(s.current && s.current.temperature !== undefined)
    );
    if (valid.length === 0) return null;

    const sortedByTempDesc = [...valid].sort((a, b) => b.current.temperature - a.current.temperature);
    const sortedByTempAsc = [...valid].sort((a, b) => a.current.temperature - b.current.temperature);
    const sortedByRainDesc = [...valid]
      .filter((s) => (s.current.precipitation ?? 0) > 0)
      .sort((a, b) => (b.current.precipitation ?? 0) - (a.current.precipitation ?? 0));

    return {
      hottest: sortedByTempDesc.slice(0, 5),
      coolest: sortedByTempAsc.slice(0, 5),
      rainy: sortedByRainDesc.slice(0, 5),
      allStates: sortedByTempDesc,
    };
  }, [overview]);

  const handleSelectState = (stateSummary: StateWeatherSummary) => {
    setSelectedLocation(stateSummary.center, stateSummary.name);
    setSelectedState(stateSummary.code);
    setNavigationLevel('state');
  };

  // If collapsed to side
  if (isCollapsed) {
    return (
      <div className="h-full w-10 bg-[#101010] border-l border-[#2A2A2A] flex flex-col items-center justify-between py-4 z-20 flex-shrink-0 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
          title="Expand Insights Panel"
          aria-label="Expand Insights Panel"
        >
          <ChevronLeft className="w-4 h-4 text-[#E7B75A]" />
        </button>

        <div className="rotate-90 text-[10px] font-mono font-semibold uppercase tracking-widest text-[#737373] whitespace-nowrap">
          {hasSelectedLocation ? locationName : 'STATION INTELLIGENCE'}
        </div>

        <div className="w-1.5 h-1.5 rounded-full bg-[#E7B75A]" />
      </div>
    );
  }

  const weatherData = fetchedData;
  const isActuallyLoading = isLoading && !weatherData;

  const tabs = [
    { id: 'current', label: 'Conditions' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'historical', label: 'History' },
    { id: 'alerts', label: 'Alerts', count: weatherData?.alerts?.length || 0 },
  ];

  return (
    <aside className="h-full w-full lg:w-[400px] xl:w-[430px] bg-[#101010] border-l border-[#2A2A2A] flex flex-col z-20 flex-shrink-0 overflow-hidden font-sans">
      {/* ── Top Header of Insights Panel ── */}
      <div className="p-3.5 bg-[#101010] border-b border-[#2A2A2A] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center text-[#E7B75A] flex-shrink-0">
            {hasSelectedLocation ? (
              <MapPin className="w-4 h-4" />
            ) : (
              <Compass className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-[#F5F5F5] font-bold text-sm truncate leading-tight">
              {hasSelectedLocation ? locationName : 'National Weather Stream'}
            </h2>
            <p className="text-[#737373] text-[11px] font-mono truncate mt-0.5">
              {hasSelectedLocation 
                ? (selectedState ? `STATE: ${selectedState} · TELEMETRY ACTIVE` : 'LOCATION OBSERVATION')
                : '37 STATES & UNION TERRITORIES REPORTING'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasSelectedLocation && (
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
              title="Refresh Location Weather"
              aria-label="Refresh Location Weather"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {hasSelectedLocation ? (
            <button
              onClick={flyToIndia}
              className="px-2 py-1 text-xs font-mono font-medium rounded bg-[#171717] text-[#A3A3A3] border border-[#2A2A2A] hover:text-[#F5F5F5] hover:border-[#E7B75A] transition-colors flex items-center gap-1"
              title="Return to National Overview"
            >
              <span>Overview</span>
              <X className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
              title="Collapse Panel"
              aria-label="Collapse Panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Panel Body ── */}
      {hasSelectedLocation ? (
        /* Scenario A: A Location IS selected — Show Tabbed City Inspector */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Tabs */}
          <div className="px-3 py-1.5 bg-[#090909] border-b border-[#2A2A2A] flex gap-1 flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 py-1 px-2 rounded text-xs font-mono transition-colors text-center flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-[#171717] text-[#E7B75A] font-semibold border border-[#2A2A2A]'
                    : 'text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717]/60'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="w-3.5 h-3.5 rounded bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/40 text-[9px] font-bold flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3.5">
            {isActuallyLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2.5 text-center">
                <Loader2 className="w-6 h-6 text-[#E7B75A] animate-spin" />
                <p className="text-[#F5F5F5] text-xs font-medium">Fetching real-time weather telemetry...</p>
                <p className="text-[#737373] text-[11px] font-mono">Open-Meteo & Cassandra stream archive</p>
              </div>
            ) : error && !weatherData ? (
              <div className="p-4 text-center rounded bg-[#171717] border border-[#D9534F]/40 space-y-2">
                <AlertTriangle className="w-6 h-6 text-[#D9534F] mx-auto" />
                <h3 className="text-[#F5F5F5] font-semibold text-xs">Failed to load station telemetry</h3>
                <p className="text-[#737373] text-[11px]">{error instanceof Error ? error.message : 'Backend connection error'}</p>
                <button
                  onClick={() => refetch()}
                  className="px-2.5 py-1 rounded bg-[#171717] text-[#D9534F] border border-[#D9534F]/40 hover:bg-[#202020] text-xs font-mono font-medium"
                >
                  Retry Request
                </button>
              </div>
            ) : weatherData ? (
              <>
                {activeTab === 'current' && <CurrentConditions data={weatherData} />}
                {activeTab === 'forecast' && <Forecast data={weatherData} />}
                {activeTab === 'historical' && <HistoricalCharts data={weatherData} />}
                {activeTab === 'alerts' && <Alerts data={weatherData} />}
                <DataFreshness data={weatherData} />
              </>
            ) : null}
          </div>
        </div>
      ) : (
        /* Scenario B: No location selected — Show India National Highlights & Leaderboards */
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4">
          {/* Quick Notice */}
          <div className="p-3 rounded bg-[#171717] border border-[#2A2A2A] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#E7B75A] flex-shrink-0 mt-0.5" />
            <p className="text-[#A3A3A3] text-xs leading-relaxed">
              Select any station on the map or click a state below to inspect real-time observations, 48-hour forecasts, and 30-day historical analytics.
            </p>
          </div>

          {nationalLeaderboards ? (
            <>
              {/* Leaderboard 1: Warmest Regions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#E07A5F]">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#E07A5F]" />
                    HIGHEST OBSERVED TEMPERATURE
                  </span>
                  <span className="text-[10px] text-[#737373]">TOP 5</span>
                </div>
                <div className="space-y-1">
                  {nationalLeaderboards.hottest.map((s, idx) => (
                    <button
                      key={s.code}
                      onClick={() => handleSelectState(s)}
                      className="w-full p-2 rounded bg-[#171717] border border-[#2A2A2A] hover:border-[#E07A5F]/60 hover:bg-[#202020] transition-colors flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded bg-[#101010] text-[#737373] text-[10px] font-mono flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-[#F5F5F5] text-xs font-medium group-hover:text-[#E07A5F] transition-colors truncate">
                            {s.name}
                          </p>
                          <p className="text-[#737373] text-[10px] uppercase font-mono">{s.current.weatherDescription}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#E07A5F] font-mono font-bold text-xs">{s.current.temperature.toFixed(1)}°C</span>
                        <ArrowRight className="w-3 h-3 text-[#737373] group-hover:text-[#E07A5F] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaderboard 2: Coolest Regions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#7899B8]">
                  <span className="flex items-center gap-1.5">
                    <Snowflake className="w-3.5 h-3.5 text-[#7899B8]" />
                    LOWEST OBSERVED TEMPERATURE
                  </span>
                  <span className="text-[10px] text-[#737373]">TOP 5</span>
                </div>
                <div className="space-y-1">
                  {nationalLeaderboards.coolest.map((s, idx) => (
                    <button
                      key={s.code}
                      onClick={() => handleSelectState(s)}
                      className="w-full p-2 rounded bg-[#171717] border border-[#2A2A2A] hover:border-[#7899B8]/60 hover:bg-[#202020] transition-colors flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded bg-[#101010] text-[#737373] text-[10px] font-mono flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-[#F5F5F5] text-xs font-medium group-hover:text-[#7899B8] transition-colors truncate">
                            {s.name}
                          </p>
                          <p className="text-[#737373] text-[10px] uppercase font-mono">{s.current.weatherDescription}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#7899B8] font-mono font-bold text-xs">{s.current.temperature.toFixed(1)}°C</span>
                        <ArrowRight className="w-3 h-3 text-[#737373] group-hover:text-[#7899B8] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaderboard 3: Precipitation Activity */}
              {nationalLeaderboards.rainy.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#7899B8]">
                    <span className="flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-[#7899B8]" />
                      ACTIVE PRECIPITATION REPORTS
                    </span>
                    <span className="text-[10px] text-[#737373]">{nationalLeaderboards.rainy.length} STATIONS</span>
                  </div>
                  <div className="space-y-1">
                    {nationalLeaderboards.rainy.map((s) => (
                      <button
                        key={s.code}
                        onClick={() => handleSelectState(s)}
                        className="w-full p-2 rounded bg-[#171717] border border-[#2A2A2A] hover:border-[#7899B8]/60 hover:bg-[#202020] transition-colors flex items-center justify-between group text-left"
                      >
                        <p className="text-[#F5F5F5] text-xs font-medium group-hover:text-[#7899B8] transition-colors truncate">
                          {s.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[#F5F5F5] font-mono font-bold text-xs">
                            {(s.current.precipitation ?? 0).toFixed(1)} mm
                          </span>
                          <ArrowRight className="w-3 h-3 text-[#737373] group-hover:text-[#7899B8] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-[#737373] text-xs font-mono">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#E7B75A] mb-2" />
              Retrieving nationwide weather telemetry...
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default InsightsPanel;
