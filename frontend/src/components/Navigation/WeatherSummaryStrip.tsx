import { useMemo } from 'react';
import { 
  Thermometer, 
  Flame, 
  Snowflake, 
  CloudRain, 
  Radio, 
  Clock,
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

    const nationalRecord = overview.national as Record<string, unknown> | undefined;
    const avgTemp = typeof nationalRecord?.avgTemperature === 'number' 
      ? nationalRecord.avgTemperature 
      : typeof nationalRecord?.avg_temperature === 'number'
      ? nationalRecord.avg_temperature
      : (states.reduce((acc, s) => acc + s.current.temperature, 0) / states.length);

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
      <div className="h-10 w-full bg-[#090909] border-b border-[#2A2A2A] px-4 flex items-center justify-between overflow-x-auto gap-2 py-1 scrollbar-none flex-shrink-0">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex-1 min-w-[140px] h-7 rounded bg-[#171717] animate-pulse border border-[#2A2A2A]" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-10 w-full bg-[#090909] border-b border-[#2A2A2A] px-4 flex items-center gap-2 overflow-x-auto py-1 scrollbar-none z-30 flex-shrink-0 font-sans">
      {/* 1. National Average Temp */}
      <div className="flex-1 min-w-[150px] h-7 px-2.5 rounded bg-[#101010] border border-[#2A2A2A] flex items-center gap-2 hover:border-[#E7B75A]/50 transition-colors">
        <Thermometer className="w-3.5 h-3.5 text-[#E7B75A] flex-shrink-0" />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-[#737373] text-[11px] font-mono uppercase tracking-wider truncate">Avg Temp</span>
          <span className="text-[#F5F5F5] font-mono font-bold text-xs">{stats.avgTemp}°C</span>
        </div>
      </div>

      {/* 2. Highest Temperature State */}
      <button 
        onClick={() => handleStateClick(stats.hottest.coords, stats.hottest.name, stats.hottest.code)}
        className="flex-1 min-w-[170px] h-7 px-2.5 rounded bg-[#101010] border border-[#2A2A2A] flex items-center gap-2 hover:border-[#E07A5F] hover:bg-[#171717] transition-all text-left group"
        title={`Inspect warmest station: ${stats.hottest.name}`}
      >
        <Flame className="w-3.5 h-3.5 text-[#E07A5F] flex-shrink-0 group-hover:scale-110 transition-transform" />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-[#A3A3A3] text-[11px] font-medium truncate">{stats.hottest.name}</span>
          <span className="text-[#E07A5F] font-mono font-bold text-xs">{stats.hottest.temp}°C</span>
        </div>
      </button>

      {/* 3. Coolest Temperature State */}
      <button 
        onClick={() => handleStateClick(stats.coolest.coords, stats.coolest.name, stats.coolest.code)}
        className="flex-1 min-w-[170px] h-7 px-2.5 rounded bg-[#101010] border border-[#2A2A2A] flex items-center gap-2 hover:border-[#7899B8] hover:bg-[#171717] transition-all text-left group"
        title={`Inspect coolest station: ${stats.coolest.name}`}
      >
        <Snowflake className="w-3.5 h-3.5 text-[#7899B8] flex-shrink-0 group-hover:scale-110 transition-transform" />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-[#A3A3A3] text-[11px] font-medium truncate">{stats.coolest.name}</span>
          <span className="text-[#7899B8] font-mono font-bold text-xs">{stats.coolest.temp}°C</span>
        </div>
      </button>

      {/* 4. Rainfall Summary */}
      <button
        onClick={() => handleStateClick(stats.maxRain.coords, stats.maxRain.name, stats.maxRain.code)}
        className="flex-1 min-w-[170px] h-7 px-2.5 rounded bg-[#101010] border border-[#2A2A2A] flex items-center gap-2 hover:border-[#7899B8] hover:bg-[#171717] transition-all text-left group"
        title={`Peak precipitation: ${stats.maxRain.name} (${stats.maxRain.amount} mm)`}
      >
        <CloudRain className="w-3.5 h-3.5 text-[#7899B8] flex-shrink-0 group-hover:scale-110 transition-transform" />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-[#A3A3A3] text-[11px] font-medium truncate">
            {stats.maxRain.rainingCount > 0 ? stats.maxRain.name : 'Rainfall'}
          </span>
          <span className="text-[#F5F5F5] font-mono font-bold text-xs">
            {Number(stats.maxRain.amount) > 0 ? `${stats.maxRain.amount} mm` : '0.0 mm'}
          </span>
        </div>
      </button>

      {/* 5. Reporting Locations Count */}
      <div className="flex-1 min-w-[140px] h-7 px-2.5 rounded bg-[#101010] border border-[#2A2A2A] flex items-center gap-2">
        <Radio className="w-3.5 h-3.5 text-[#3EA874] flex-shrink-0" />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-[#737373] text-[11px] font-mono uppercase tracking-wider truncate">Reporting</span>
          <span className="text-[#3EA874] font-mono font-semibold text-xs">
            {stats.reportingCount}
          </span>
        </div>
      </div>

      {/* 6. Observation Freshness */}
      <div className="flex-1 min-w-[150px] h-7 px-2.5 rounded bg-[#101010] border border-[#2A2A2A] flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-[#737373] flex-shrink-0" />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span className="text-[#737373] text-[11px] font-mono uppercase tracking-wider truncate">Sync</span>
          <span className="text-[#A3A3A3] font-mono text-[11px] truncate">{stats.timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

export default WeatherSummaryStrip;
