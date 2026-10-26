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
  Cell,
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus, BarChart2, Droplets } from 'lucide-react';
import type { WeatherDashboardData, WeatherTrends, HistoricalDataPoint } from '../../types';

interface HistoricalChartsProps {
  data: WeatherDashboardData | null;
}

export function HistoricalCharts({ data }: HistoricalChartsProps) {
  const trends = data?.trends;
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Filter data based on selected period
  const filteredTempData = useMemo(() => {
    if (!trends) return [];
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return trends.temperature.data.filter((d) => new Date(d.timestamp).getTime() >= cutoff);
  }, [trends, period]);

  const filteredPrecipData = useMemo(() => {
    if (!trends) return [];
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return trends.precipitation.data.filter((d) => new Date(d.timestamp).getTime() >= cutoff);
  }, [trends, period]);

  const tempStats = useMemo(() => {
    if (filteredTempData.length === 0) return { min: 0, max: 0, avg: 0, trend: 0 };
    const temps = filteredTempData.map((d) => d.temperature);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const trend = temps.length > 1 ? temps[temps.length - 1] - temps[0] : 0;
    return { min, max, avg, trend };
  }, [filteredTempData]);

  const precipStats = useMemo(() => {
    if (filteredPrecipData.length === 0) return { total: 0, avg: 0 };
    const total = filteredPrecipData.reduce((a, b) => a + b.precipitation, 0);
    const avg = total / filteredPrecipData.length;
    return { total, avg };
  }, [filteredPrecipData]);

  if (!trends) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800/50 flex items-center justify-center">
          <BarChart2 className="w-8 h-8 text-neutral-500" />
        </div>
        <h3 className="text-neutral-400 font-medium">No historical data available</h3>
        <p className="text-neutral-500 text-sm mt-1">
          Historical trends will appear here once data is loaded
        </p>
      </div>
    );
  }

  if (filteredTempData.length === 0 && filteredPrecipData.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800/50 flex items-center justify-center">
          <BarChart2 className="w-8 h-8 text-neutral-500" />
        </div>
        <h3 className="text-neutral-400 font-medium">No readings in this period</h3>
        <p className="text-neutral-500 text-sm mt-1">Choose a longer range or wait for the streaming pipeline to collect observations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h4 className="text-neutral-200 font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Historical Trends
        </h4>
        <div className="tab-list">
          {(['7d', '30d', '90d', '1y'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`tab ${period === p ? 'data-[state=active]' : ''}`}
              data-state={period === p ? 'active' : 'inactive'}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-red-400" />}
          label="Max Temp"
          value={`${tempStats.max.toFixed(1)}°`}
          trend={tempStats.trend > 0 ? 'up' : tempStats.trend < 0 ? 'down' : 'neutral'}
          trendValue={Math.abs(tempStats.trend).toFixed(1)}
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5 text-blue-400" />}
          label="Min Temp"
          value={`${tempStats.min.toFixed(1)}°`}
        />
        <StatCard
          icon={<Minus className="w-5 h-5 text-yellow-400" />}
          label="Avg Temp"
          value={`${tempStats.avg.toFixed(1)}°`}
        />
        <StatCard
          icon={<Droplets className="w-5 h-5 text-cyan-400" />}
          label="Total Rainfall"
          value={`${precipStats.total.toFixed(1)} mm`}
        />
      </div>

      {/* Temperature Chart */}
      <div className="glass-card p-5">
        <h5 className="text-neutral-200 font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-400" />
          Temperature Trend ({period.toUpperCase()})
        </h5>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredTempData}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59 / 0.5)" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => formatChartDate(value, period)}
                tick={{ fill: 'rgb(100 116 139)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'rgb(51 65 85)' }}
                tickLine={{ stroke: 'rgb(51 65 85)' }}
              />
              <YAxis
                tick={{ fill: 'rgb(100 116 139)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'rgb(51 65 85)' }}
                tickLine={{ stroke: 'rgb(51 65 85)' }}
                label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fill: 'rgb(100 116 139)', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(15 23 42)',
                  border: '1px solid rgb(51 65 85)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                }}
                labelFormatter={(value) => formatTooltipDate(value)}
                formatter={(value: number) => [value.toFixed(1) + '°C', 'Temperature']}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={() => 'Temperature'}
              />
              <Area
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tempGradient)"
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Precipitation Chart */}
      <div className="glass-card p-5">
        <h5 className="text-neutral-200 font-medium mb-4 flex items-center gap-2">
          <Droplets className="w-4 h-4 text-cyan-400" />
          Precipitation ({period.toUpperCase()})
        </h5>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredPrecipData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59 / 0.5)" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => formatChartDate(value, period)}
                tick={{ fill: 'rgb(100 116 139)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'rgb(51 65 85)' }}
                tickLine={{ stroke: 'rgb(51 65 85)' }}
              />
              <YAxis
                tick={{ fill: 'rgb(100 116 139)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'rgb(51 65 85)' }}
                tickLine={{ stroke: 'rgb(51 65 85)' }}
                label={{ value: 'Precipitation (mm)', angle: -90, position: 'insideLeft', fill: 'rgb(100 116 139)', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(15 23 42)',
                  border: '1px solid rgb(51 65 85)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                }}
                labelFormatter={(value) => formatTooltipDate(value)}
                formatter={(value: number) => [value.toFixed(1) + ' mm', 'Precipitation']}
              />
              <Line
                type="monotone"
                dataKey="precipitation"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#06b6d4' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Source Note */}
      <div className="flex items-center gap-2 text-neutral-500 text-sm p-3 glass-subtle rounded-xl">
        <Calendar className="w-4 h-4" />
        <span>
          Data source: {trends.temperature.data[0]?.source === 'cassandra' ? 'Cassandra (Observed)' : 'Open-Meteo (Model)'}
          {' • '}
          {trends.temperature.data.length} data points
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
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {trend && trendValue && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-neutral-500'}`}>
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {trend === 'neutral' && <Minus className="w-3 h-3" />}
          <span>{trendValue}°</span>
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
