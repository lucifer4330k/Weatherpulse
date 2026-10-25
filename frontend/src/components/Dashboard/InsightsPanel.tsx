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
  Thermometer,
  CloudRain,
  Flame,
  Snowflake,
  Compass,
  ArrowRight,
  TrendingUp,
  BarChart2,
  Calendar,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useAppStore, useSelectedLocationName, useSelectedLocation, useSelectedState } from '../../store/useAppStore';
import { useDashboardData, useIndiaOverview as useIndiaOverviewQuery } from '../../hooks/useWeather';
import { CurrentConditions } from './CurrentConditions';
import { Forecast } from './Forecast';
import { HistoricalCharts } from './HistoricalCharts';
import { Alerts } from './Alerts';
import { DataFreshness } from './DataFreshness';
import type { WeatherDashboardData, StateWeatherSummary } from '../../types';

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
  const [nationalSearch, setNationalSearch] = useState('');

  // Fetch location weather when selected
  const hasSelectedLocation = Boolean(selectedLocation && locationName);
  const { data: fetchedData, isLoading, error, refetch } = useDashboardData(
    selectedLocation, 
    locationName, 
    hasSelectedLocation
  );

  // Read India national overview
  const { data: overview, isLoading: isOverviewLoading } = useIndiaOverviewQuery();

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
      <div className="h-full w-10 bg-[#0B1526] border-l border-[#1E2E48] flex flex-col items-center justify-between py-4 z-20 flex-shrink-0 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2E48] transition-colors"
          title="Expand Insights Panel"
          aria-label="Expand Insights Panel"
        >
          <ChevronLeft className="w-5 h-5 text-cyan-400" />
        </button>

        <div className="rotate-90 text-[11px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap">
          {hasSelectedLocation ? locationName : 'Weather Intelligence'}
        </div>

        <div className="w-2 h-2 rounded-full bg-cyan-400 geo-radar-pulse" />
      </div>
    );
  }

  const weatherData = fetchedData;
  const isActuallyLoading = isLoading && !weatherData;

  const tabs = [
    { id: 'current', label: 'Conditions' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'historical', label: 'Trends' },
    { id: 'alerts', label: 'Alerts', count: weatherData?.alerts?.length || 0 },
  ];

  return (
    <aside className="h-full w-full lg:w-[400px] xl:w-[440px] bg-[#0B1526] border-l border-[#1E2E48] flex flex-col z-20 flex-shrink-0 overflow-hidden shadow-2xl shadow-black/60">
      {/* ── Top Header of Insights Panel ── */}
      <div className="p-4 bg-[#0D1828] border-b border-[#1E2E48] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-600/20 flex-shrink-0">
            {hasSelectedLocation ? (
              <MapPin className="w-5 h-5 text-cyan-200" />
            ) : (
              <Compass className="w-5 h-5 text-cyan-200" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-base truncate leading-tight">
                {hasSelectedLocation ? locationName : 'India National Overview'}
              </h2>
            </div>
            <p className="text-slate-400 text-xs truncate mt-0.5">
              {hasSelectedLocation 
                ? (selectedState ? `State: ${selectedState} • Live Observations` : 'Selected City Observation')
                : '37 States & Union Territories Reporting'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasSelectedLocation && (
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2E48] transition-colors"
              title="Refresh Location Weather"
              aria-label="Refresh Location Weather"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {hasSelectedLocation ? (
            <button
              onClick={flyToIndia}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-all flex items-center gap-1"
              title="Return to National Overview"
            >
              <span>Overview</span>
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2E48] transition-colors"
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
          <div className="px-4 py-2 bg-[#091222] border-b border-[#1E2E48] flex gap-1 flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/50 text-[10px] font-bold flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {isActuallyLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-white text-sm font-medium">Fetching real-time weather...</p>
                <p className="text-slate-500 text-xs">Querying Open-Meteo & Cassandra archive</p>
              </div>
            ) : error && !weatherData ? (
              <div className="p-6 text-center rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-3">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                <h3 className="text-white font-semibold text-sm">Unable to load location details</h3>
                <p className="text-slate-400 text-xs">{error instanceof Error ? error.message : 'Backend connection error'}</p>
                <button
                  onClick={() => refetch()}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-semibold"
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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
          {/* Quick Notice */}
          <div className="p-3.5 rounded-xl bg-[#0D1828] border border-[#1E2E48] flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-300 text-xs leading-relaxed">
              Click any state on the map or select below to inspect real-time temperature, rainfall, 48-hour forecasts, and 30-day historical analytics.
            </p>
          </div>

          {nationalLeaderboards ? (
            <>
              {/* Leaderboard 1: Warmest Regions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Warmest Reporting States
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Top 5</span>
                </div>
                <div className="space-y-1.5">
                  {nationalLeaderboards.hottest.map((s, idx) => (
                    <button
                      key={s.code}
                      onClick={() => handleSelectState(s)}
                      className="w-full p-2.5 rounded-lg bg-[#0D1828] border border-[#1E2E48] hover:border-amber-500/40 hover:bg-[#122036] transition-all flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-white text-xs font-medium group-hover:text-amber-300 transition-colors truncate">
                            {s.name}
                          </p>
                          <p className="text-slate-500 text-[10px] uppercase font-mono">{s.current.weather_description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-mono font-bold text-xs">{s.current.temperature.toFixed(1)}°C</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaderboard 2: Coolest Regions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-sky-400">
                  <span className="flex items-center gap-1.5">
                    <Snowflake className="w-4 h-4 text-sky-400" />
                    Coolest Reporting States
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Top 5</span>
                </div>
                <div className="space-y-1.5">
                  {nationalLeaderboards.coolest.map((s, idx) => (
                    <button
                      key={s.code}
                      onClick={() => handleSelectState(s)}
                      className="w-full p-2.5 rounded-lg bg-[#0D1828] border border-[#1E2E48] hover:border-sky-500/40 hover:bg-[#122036] transition-all flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-white text-xs font-medium group-hover:text-sky-300 transition-colors truncate">
                            {s.name}
                          </p>
                          <p className="text-slate-500 text-[10px] uppercase font-mono">{s.current.weather_description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sky-300 font-mono font-bold text-xs">{s.current.temperature.toFixed(1)}°C</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaderboard 3: Precipitation Activity */}
              {nationalLeaderboards.rainy.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-400">
                    <span className="flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 text-blue-400" />
                      Active Rainfall Reports
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">{nationalLeaderboards.rainy.length} States</span>
                  </div>
                  <div className="space-y-1.5">
                    {nationalLeaderboards.rainy.map((s) => (
                      <button
                        key={s.code}
                        onClick={() => handleSelectState(s)}
                        className="w-full p-2.5 rounded-lg bg-[#0D1828] border border-[#1E2E48] hover:border-blue-500/40 hover:bg-[#122036] transition-all flex items-center justify-between group text-left"
                      >
                        <p className="text-white text-xs font-medium group-hover:text-blue-300 transition-colors truncate">
                          {s.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-300 font-mono font-bold text-xs">
                            {(s.current.precipitation ?? 0).toFixed(1)} mm
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
              Loading nationwide weather network...
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
