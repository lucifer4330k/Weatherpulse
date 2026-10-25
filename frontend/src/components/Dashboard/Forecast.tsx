import { useState } from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, ChevronRight, Calendar, Clock, Waves, Sun as SunIcon, CloudSnow, Zap, Eye, Droplet, Compass } from 'lucide-react';
import type { WeatherDashboardData, HourlyForecast, DailyForecast } from '../../types';
import { getUVIndexDescription, getWindSpeedDescription, getWindDirectionText } from '../../services/mapUtils';

interface ForecastProps {
  data: WeatherDashboardData | null;
}

export function Forecast({ data }: ForecastProps) {
  const [view, setView] = useState<'hourly' | 'daily'>('hourly');
  const hourly = data?.hourly || [];
  const daily = data?.daily || [];

  if (hourly.length === 0 && daily.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800/50 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-neutral-500" />
        </div>
        <h3 className="text-neutral-400 font-medium">No forecast data available</h3>
        <p className="text-neutral-500 text-sm mt-1">Forecast information will appear here when available</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* View Toggle */}
      <div className="tab-list">
        <button
          onClick={() => setView('hourly')}
          className={`tab ${view === 'hourly' ? 'data-[state=active]' : ''}`}
          data-state={view === 'hourly' ? 'active' : 'inactive'}
        >
          <Clock className="w-4 h-4" />
          Hourly (48h)
        </button>
        <button
          onClick={() => setView('daily')}
          className={`tab ${view === 'daily' ? 'data-[state=active]' : ''}`}
          data-state={view === 'daily' ? 'active' : 'inactive'}
        >
          <Calendar className="w-4 h-4" />
          Daily (7d)
        </button>
      </div>

      {view === 'hourly' && hourly.length > 0 && (
        <HourlyForecastView data={hourly} />
      )}

      {view === 'daily' && daily.length > 0 && (
        <DailyForecastView data={daily} />
      )}
    </div>
  );
}

function HourlyForecastView({ data }: { data: HourlyForecast[] }) {
  return (
    <div className="space-y-4">
      <h4 className="text-neutral-200 font-medium flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Next 48 Hours
      </h4>
      <div className="overflow-x-auto pb-4 scrollbar-thin">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-neutral-500 border-b border-neutral-800/50">
              <th className="text-left py-3 px-3">Time</th>
              <th className="text-left py-3 px-3">Temp</th>
              <th className="text-left py-3 px-3">Feels Like</th>
              <th className="text-left py-3 px-3">Condition</th>
              <th className="text-left py-3 px-3">Precip</th>
              <th className="text-left py-3 px-3">Humidity</th>
              <th className="text-left py-3 px-3">Wind</th>
              <th className="text-left py-3 px-3">Cloud</th>
              <th className="text-left py-3 px-3">UV</th>
              <th className="text-left py-3 px-3">Pressure</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 48).map((hour, index) => (
              <tr
                key={hour.time}
                className={`border-b border-neutral-800/30 hover:bg-neutral-800/50 transition-colors ${
                  index === 0 ? 'bg-primary-500/10' : ''
                }`}
              >
                <td className="py-3 px-3 font-medium text-white font-mono tabular-nums">
                  {formatHour(hour.time.toString())}
                </td>
                <td className="py-3 px-3 text-white tabular-nums font-medium">
                  {Math.round(hour.temperature)}°
                </td>
                <td className="py-3 px-3 text-neutral-400 tabular-nums">
                  {Math.round(hour.feelsLike)}°
                </td>
                <td className="py-3 px-3 flex items-center gap-2">
                  {getWeatherIcon(hour.weatherCode)}
                  <span className="text-neutral-300 capitalize">{hour.weatherDescription}</span>
                </td>
                <td className="py-3 px-3 flex items-center gap-1 text-blue-400">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>{hour.precipitation.toFixed(1)}mm ({hour.precipitationProbability}%)</span>
                </td>
                <td className="py-3 px-3 text-neutral-300 tabular-nums">
                  {hour.humidity}%
                </td>
                <td className="py-3 px-3 flex items-center gap-1 text-green-400">
                  <Wind className="w-3.5 h-3.5" />
                  <span>{hour.windSpeed} km/h {hour.windDirectionText}</span>
                </td>
                <td className="py-3 px-3 flex items-center gap-1 text-indigo-400">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{hour.cloudCover}%</span>
                </td>
                <td className="py-3 px-3 flex items-center gap-1 text-orange-400">
                  <SunIcon className="w-3.5 h-3.5" />
                  <span>{hour.uvIndex}</span>
                </td>
                <td className="py-3 px-3 text-neutral-300 tabular-nums">
                  {hour.pressure} hPa
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DailyForecastView({ data }: { data: DailyForecast[] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-neutral-200 font-medium flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        7-Day Forecast
      </h4>
      <div className="space-y-2">
        {data.map((day) => (
          <DailyForecastCard key={day.date} data={day} />
        ))}
      </div>
    </div>
  );
}

function DailyForecastCard({ data }: { data: DailyForecast }) {
  const isToday = new Date(data.date).toDateString() === new Date().toDateString();

  return (
    <div className={`glass-card-hover p-4 ${isToday ? 'border-primary-500/30 bg-primary-500/5' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isToday ? 'bg-primary-500/20' : 'bg-neutral-800/50'
          }`}>
            {getWeatherIcon(data.weatherCode)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${isToday ? 'text-primary-400' : 'text-white'}`}>
                {isToday ? 'Today' : formatDay(data.date.toString())}
              </span>
              <span className="text-neutral-400 text-sm">{data.weatherDescription}</span>
            </div>
            <div className="flex items-center gap-4 text-neutral-500 text-xs mt-1">
              <span className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
                {formatTime(data.sunrise.toString())}
              </span>
              <span className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-orange-400" />
                {formatTime(data.sunset.toString())}
              </span>
              <span className="flex items-center gap-1">
                <SunIcon className="w-3.5 h-3.5 text-orange-400" />
                UV {data.uvIndexMax}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right min-w-[250px]">
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-white tabular-nums">{Math.round(data.temperatureMax)}°</span>
            <span className="text-neutral-400 text-sm">/{Math.round(data.temperatureMin)}°</span>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-neutral-400">
            <div className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              <span>{data.precipitationSum.toFixed(1)}mm ({data.precipitationProbabilityMax}%)</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              <span>{data.windSpeedMax} km/h {data.windDirectionText ?? ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <SunIcon className="w-3 h-3" />
              <span>UV {data.uvIndexMax}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="w-5 h-5 text-yellow-400" />;
  if (code <= 3) return <Cloud className="w-5 h-5 text-neutral-300" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (code >= 71 && code <= 77) return <CloudSnow className="w-5 h-5 text-blue-300" />;
  if (code >= 80 && code <= 82) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (code >= 95) return <Zap className="w-5 h-5 text-yellow-400" />;
  return <Cloud className="w-5 h-5 text-neutral-300" />;
}

function formatHour(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDay(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default Forecast;