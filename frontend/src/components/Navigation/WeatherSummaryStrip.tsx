import { useMemo } from 'react';
import { 
  Thermometer, 
  Flame, 
  Snowflake, 
  CloudRain, 
  Radio, 
  Clock,
  Droplets,
  Wind
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useIndiaOverview } from '../../hooks/useWeather';
import { useAppStore } from '../../store/useAppStore';

export function WeatherSummaryStrip() {
  const { data: overview, isLoading } = useIndiaOverview();
  const setSelectedLocation = useAppStore((state) => state.setSelectedLocation);
  const setNavigationLevel = useAppStore((state) => state.setNavigationLevel);
  const setSelectedState = useAppStore((state) => state.setSelectedState);

  const stats = useMemo(() => {
    if (!overview || !overview.states || overview.states.length === 0) {
      return null;
    }

    const states = overview.states.filter((s): s is typeof s & { current: NonNullable<typeof s.current> } => 
      Boolean(s.current && s.current.temperature !== undefined)
    );
    if (states.length === 0) return null;

    let hottest = states[0];
    let coolest = states[0];
    let maxRainState = states[0];
    let rainingCount = 0;

    for (const state of states) {
      const temp = state.current.temperature;
      const rain = state.current.precipitation ?? 0;

      if (temp > hottest.current.temperature) hottest = state;
      if (temp < coolest.current.temperature) coolest = state;
      if (rain > (maxRainState.current.precipitation ?? 0)) maxRainState = state;
      if (rain > 0) rainingCount++;
    }

    const avgTemp = (overview.national as any)?.avgTemperature ?? (overview.national as any)?.avg_temperature ?? 
      (states.reduce((acc, s) => acc + s.current.temperature, 0) / states.length);

    let timeAgo = 'Just now';
    if (overview.timestamp) {
      try {
        timeAgo = formatDistanceToNow(parseISO(overview.timestamp), { addSuffix: true });
      } catch {
        timeAgo = 'Recently';
      }
    }

    return {
      avgTemp: avgTemp.toFixed(1),
      hottest: {
        name: hottest.name,
        code: hottest.code,
        temp: hottest.current.temperature.toFixed(1),
        coords: hottest.center,
      },
      coolest: {
        name: coolest.name,
        code: coolest.code,
        temp: coolest.current.temperature.toFixed(1),
        coords: coolest.center,
      },
      maxRain: {
        name: maxRainState.name,
        code: maxRainState.code,
        amount: (maxRainState.current.precipitation ?? 0).toFixed(1),
        rainingCount,
        coords: maxRainState.center,
      },
      reportingCount: `${states.length}/${overview.states.length}`,
      timeAgo,
    };
  }, [overview]);

  const handleStateClick = (coords: { lat: number; lon: number }, name: string, code: string) => {
    setSelectedLocation(coords, name);
    setSelectedState(code);
    setNavigationLevel('state');
  };

  if (isLoading || !stats) {
    return (
      <div className="h-12 w-full bg-[#07111F]/90 border-b border-[#1E2E48]/80 px-4 flex items-center justify-between overflow-x-auto gap-3 py-1.5 scrollbar-none flex-shrink-0">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex-1 min-w-[150px] h-9 rounded-lg bg-[#0D1828]/60 animate-pulse border border-[#1E2E48]/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-12 w-full bg-[#07111F]/95 border-b border-[#1E2E48]/80 px-4 flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none z-30 flex-shrink-0">
      {/* 1. National Average Temp */}
      <div className="flex-1 min-w-[160px] h-9 px-3 rounded-lg bg-[#0D1828]/80 border border-[#1E2E48] flex items-center gap-2.5 hover:border-cyan-500/30 transition-all">
        <div className="w-6 h-6 rounded-md bg-cyan-500/15 flex items-center justify-center flex-shrink-0 text-cyan-400">
          <Thermometer className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-slate-400 text-[11px] font-medium truncate">National Avg</span>
          <span className="text-white font-mono font-bold text-xs tracking-tight">{stats.avgTemp}°C</span>
        </div>
      </div>

      {/* 2. Highest Temperature State */}
      <button 
        onClick={() => handleStateClick(stats.hottest.coords, stats.hottest.name, stats.hottest.code)}
        className="flex-1 min-w-[180px] h-9 px-3 rounded-lg bg-[#0D1828]/80 border border-[#1E2E48] flex items-center gap-2.5 hover:border-amber-500/40 hover:bg-[#122036] transition-all text-left group"
        title={`Click to inspect ${stats.hottest.name}`}
      >
        <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center flex-shrink-0 text-amber-400 group-hover:scale-105 transition-transform">
          <Flame className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-slate-400 text-[11px] font-medium truncate">{stats.hottest.name}</span>
          <span className="text-amber-400 font-mono font-bold text-xs tracking-tight">{stats.hottest.temp}°C</span>
        </div>
      </button>

      {/* 3. Coolest Temperature State */}
      <button 
        onClick={() => handleStateClick(stats.coolest.coords, stats.coolest.name, stats.coolest.code)}
        className="flex-1 min-w-[180px] h-9 px-3 rounded-lg bg-[#0D1828]/80 border border-[#1E2E48] flex items-center gap-2.5 hover:border-sky-500/40 hover:bg-[#122036] transition-all text-left group"
        title={`Click to inspect ${stats.coolest.name}`}
      >
        <div className="w-6 h-6 rounded-md bg-sky-500/15 flex items-center justify-center flex-shrink-0 text-sky-400 group-hover:scale-105 transition-transform">
          <Snowflake className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-slate-400 text-[11px] font-medium truncate">{stats.coolest.name}</span>
          <span className="text-sky-300 font-mono font-bold text-xs tracking-tight">{stats.coolest.temp}°C</span>
        </div>
      </button>

      {/* 4. Rainfall Summary */}
      <button
        onClick={() => handleStateClick(stats.maxRain.coords, stats.maxRain.name, stats.maxRain.code)}
        className="flex-1 min-w-[180px] h-9 px-3 rounded-lg bg-[#0D1828]/80 border border-[#1E2E48] flex items-center gap-2.5 hover:border-blue-500/40 hover:bg-[#122036] transition-all text-left group"
        title={`Peak rain: ${stats.maxRain.name} (${stats.maxRain.amount} mm)`}
      >
        <div className="w-6 h-6 rounded-md bg-blue-500/15 flex items-center justify-center flex-shrink-0 text-blue-400 group-hover:scale-105 transition-transform">
          <CloudRain className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-slate-400 text-[11px] font-medium truncate">
            {stats.maxRain.rainingCount > 0 ? `${stats.maxRain.name}` : 'Precipitation'}
          </span>
          <span className="text-blue-300 font-mono font-bold text-xs tracking-tight">
            {Number(stats.maxRain.amount) > 0 ? `${stats.maxRain.amount} mm` : '0.0 mm'}
          </span>
        </div>
      </button>

      {/* 5. Reporting Locations Count */}
      <div className="flex-1 min-w-[150px] h-9 px-3 rounded-lg bg-[#0D1828]/80 border border-[#1E2E48] flex items-center gap-2.5 hover:border-emerald-500/30 transition-all">
        <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center flex-shrink-0 text-emerald-400">
          <Radio className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-slate-400 text-[11px] font-medium truncate">Coverage</span>
          <span className="text-emerald-400 font-mono font-semibold text-xs tracking-tight">
            {stats.reportingCount} States
          </span>
        </div>
      </div>

      {/* 6. Observation Freshness */}
      <div className="flex-1 min-w-[160px] h-9 px-3 rounded-lg bg-[#0D1828]/80 border border-[#1E2E48] flex items-center gap-2.5 hover:border-slate-600 transition-all">
        <div className="w-6 h-6 rounded-md bg-slate-800/60 flex items-center justify-center flex-shrink-0 text-slate-400">
          <Clock className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-slate-400 text-[11px] font-medium truncate">Updated</span>
          <span className="text-slate-300 font-mono text-[11px] truncate">{stats.timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
