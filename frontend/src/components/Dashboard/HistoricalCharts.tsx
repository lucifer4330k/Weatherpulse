import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus, BarChart2, Droplets } from 'lucide-react';
import type { WeatherDashboardData } from '../../types';

interface HistoricalChartsProps {
  data: WeatherDashboardData | null;
}

export function HistoricalCharts({ data }: HistoricalChartsProps) {
  const trends = data?.trends;
  const [period, setPeriod] = useState<'7d' | '30d'>('30d');

  // Filter data based on selected period
  const filteredTempData = useMemo(() => {
    if (!trends) return [];
    const days = period === '7d' ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return trends.temperature.data.filter((d) => d.temperature != null && new Date(d.timestamp).getTime() >= cutoff);
  }, [trends, period]);

  const filteredPrecipData = useMemo(() => {
    if (!trends) return [];
    const days = period === '7d' ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return trends.precipitation.data.filter((d) => d.precipitation != null && new Date(d.timestamp).getTime() >= cutoff);
  }, [trends, period]);

  const tempStats = useMemo(() => {
    if (filteredTempData.length === 0) return { min: null, max: null, avg: null, trend: null };
    const temps = filteredTempData.map((d) => d.temperature).filter((value): value is number => value != null);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const trend = temps.length > 1 ? temps[temps.length - 1] - temps[0] : 0;
    return { min, max, avg, trend };
  }, [filteredTempData]);

  const precipStats = useMemo(() => {
    if (filteredPrecipData.length === 0) return { avg: null };
    const values = filteredPrecipData.map((d) => d.precipitation).filter((value): value is number => value != null);
    return { avg: values.reduce((a, b) => a + b, 0) / values.length };
  }, [filteredPrecipData]);

  if (!trends) {
    return (
      <div className="bg-[#101010] border border-[#2A2A2A] rounded p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center">
          <BarChart2 className="w-6 h-6 text-[#737373]" />
        </div>
        <h3 className="text-[#A3A3A3] font-medium text-sm">No historical data available</h3>
        <p className="text-[#737373] text-xs mt-1">
          Historical trends will appear here once observations are recorded
        </p>
      </div>
    );
  }

  if (filteredTempData.length === 0 && filteredPrecipData.length === 0) {
    return (
      <div className="bg-[#101010] border border-[#2A2A2A] rounded p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center">
          <BarChart2 className="w-6 h-6 text-[#737373]" />
        </div>
        <h3 className="text-[#A3A3A3] font-medium text-sm">No readings in this period</h3>
        <p className="text-[#737373] text-xs mt-1">Select a longer time window or wait for streaming observations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h4 className="text-[#F5F5F5] text-xs font-mono uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#E7B75A]" />
          Historical Observations
        </h4>
        <div className="flex items-center gap-1 bg-[#101010] border border-[#2A2A2A] rounded p-0.5">
          {(['7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                period === p 
                  ? 'bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/40' 
                  : 'text-[#737373] hover:text-[#F5F5F5]'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-[#E07A5F]" />}
          label="Max Observed"
          value={tempStats.max == null ? '—' : `${tempStats.max.toFixed(1)}°C`}
          trend={tempStats.trend == null ? undefined : tempStats.trend > 0 ? 'up' : tempStats.trend < 0 ? 'down' : 'neutral'}
          trendValue={tempStats.trend == null ? undefined : Math.abs(tempStats.trend).toFixed(1)}
        />
        <StatCard
          icon={<TrendingDown className="w-4 h-4 text-[#7899B8]" />}
          label="Min Observed"
          value={tempStats.min == null ? '—' : `${tempStats.min.toFixed(1)}°C`}
        />
        <StatCard
          icon={<Minus className="w-4 h-4 text-[#E7B75A]" />}
          label="Mean Temp"
          value={tempStats.avg == null ? '—' : `${tempStats.avg.toFixed(1)}°C`}
        />
        <StatCard
          icon={<Droplets className="w-4 h-4 text-[#7899B8]" />}
          label="Mean Sampled Rain"
          value={precipStats.avg == null ? '—' : `${precipStats.avg.toFixed(1)} mm`}
        />
      </div>

      {/* Temperature Chart */}
      <div className="bg-[#101010] border border-[#2A2A2A] rounded p-4">
        <h5 className="text-[#F5F5F5] text-xs font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-[#E7B75A]" />
          Temperature Trend ({period.toUpperCase()})
        </h5>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredTempData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E7B75A" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E7B75A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => formatChartDate(value, period)}
                tick={{ fill: '#737373', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#2A2A2A' }}
                tickLine={{ stroke: '#2A2A2A' }}
              />
              <YAxis
                tick={{ fill: '#737373', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#2A2A2A' }}
                tickLine={{ stroke: '#2A2A2A' }}
                unit="°C"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid #2A2A2A',
                  borderRadius: '4px',
                  color: '#F5F5F5',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                }}
                labelFormatter={(value) => formatTooltipDate(value)}
                formatter={(value: number) => [`${value.toFixed(1)}°C`, 'Temperature']}
              />
              <Legend
                wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                formatter={() => 'Temperature (°C)'}
              />
              <Area
                type="monotone"
                dataKey="temperature"
                stroke="#E7B75A"
                strokeWidth={1.75}
                fillOpacity={1}
                fill="url(#tempGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 1.5, stroke: '#E7B75A', fill: '#171717' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Precipitation Chart */}
      <div className="bg-[#101010] border border-[#2A2A2A] rounded p-4">
        <h5 className="text-[#F5F5F5] text-xs font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5 text-[#7899B8]" />
          Precipitation Records ({period.toUpperCase()})
        </h5>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredPrecipData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => formatChartDate(value, period)}
                tick={{ fill: '#737373', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#2A2A2A' }}
                tickLine={{ stroke: '#2A2A2A' }}
              />
              <YAxis
                tick={{ fill: '#737373', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#2A2A2A' }}
                tickLine={{ stroke: '#2A2A2A' }}
                unit="mm"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid #2A2A2A',
                  borderRadius: '4px',
                  color: '#F5F5F5',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                }}
                labelFormatter={(value) => formatTooltipDate(value)}
                formatter={(value: number) => [`${value.toFixed(1)} mm`, 'Precipitation']}
              />
              <Line
                type="monotone"
                dataKey="precipitation"
                stroke="#7899B8"
                strokeWidth={1.75}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 1.5, stroke: '#7899B8', fill: '#171717' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Source Note */}
      <div className="flex items-center gap-2 text-[#737373] text-xs font-mono p-2.5 bg-[#101010] border border-[#2A2A2A] rounded">
        <Calendar className="w-3.5 h-3.5 text-[#E7B75A]" />
        <span>
          Source: {trends.temperature.data[0]?.source === 'cassandra' ? 'Cassandra Storage' : 'Open-Meteo Archive'}
          {' • '}
          {trends.temperature.data.length} observations
        </span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, trendValue }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  return (
    <div className="bg-[#101010] border border-[#2A2A2A] rounded p-3">
      <div className="flex items-center gap-2 text-[#737373] text-xs mb-1">
        {icon}
        <span className="font-mono text-[11px] text-[#A3A3A3] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-mono font-semibold text-[#F5F5F5] tabular-nums">{value}</p>
      {trend && trendValue && (
        <p className={`text-[11px] font-mono mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-[#D9534F]' : trend === 'down' ? 'text-[#3EA874]' : 'text-[#737373]'}`}>
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {trend === 'neutral' && <Minus className="w-3 h-3" />}
          <span>Δ {trendValue}°C</span>
        </p>
      )}
    </div>
  );
}

function formatChartDate(timestamp: string, period: string): string {
  const date = new Date(timestamp);
  if (period === '7d') {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  if (period === '30d') {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  if (period === '90d') {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
}

function formatTooltipDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default HistoricalCharts;
