import { useState } from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, Calendar, Clock, Sun as SunIcon, CloudSnow, Zap } from 'lucide-react';
import type { WeatherDashboardData, HourlyForecast, DailyForecast } from '../../types';

interface ForecastProps {
  data: WeatherDashboardData | null;
}

export function Forecast({ data }: ForecastProps) {
  const [view, setView] = useState<'hourly' | 'daily'>('hourly');
  const hourly = data?.hourly || [];
  const daily = data?.daily || [];

  if (hourly.length === 0 && daily.length === 0) {
    return (
      <div className="bg-[#101010] border border-[#2A2A2A] rounded p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center">
          <Calendar className="w-6 h-6 text-[#737373]" />
        </div>
        <h3 className="text-[#A3A3A3] font-medium text-sm">No forecast data available</h3>
        <p className="text-[#737373] text-xs mt-1">Forecast records will appear here when available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-[#101010] border border-[#2A2A2A] rounded p-0.5 w-fit">
        <button
          onClick={() => setView('hourly')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
            view === 'hourly' 
              ? 'bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/40' 
              : 'text-[#737373] hover:text-[#F5F5F5]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Hourly (48h)
        </button>
        <button
          onClick={() => setView('daily')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
            view === 'daily' 
              ? 'bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/40' 
              : 'text-[#737373] hover:text-[#F5F5F5]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
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
    <div className="space-y-3">
      <h4 className="text-[#F5F5F5] text-xs font-mono uppercase tracking-wider flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-[#E7B75A]" />
        Next 48 Hours Projection
      </h4>
      <div className="overflow-x-auto pb-2 scrollbar-thin border border-[#2A2A2A] rounded bg-[#101010]">
        <table className="w-full min-w-[850px] text-xs font-mono">
          <thead>
            <tr className="text-[#737373] bg-[#141414] border-b border-[#2A2A2A]">
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">Time</th>
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">Temp</th>
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">Feels</th>
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">Sky</th>
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">Precip</th>
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">Humid</th>
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">Wind</th>
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">Cloud</th>
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">UV</th>
              <th className="text-left py-2.5 px-3 uppercase tracking-wider font-semibold text-[10px]">Pressure</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 48).map((hour, index) => (
              <tr
                key={hour.time}
                className={`border-b border-[#1F1F1F] hover:bg-[#171717] transition-colors ${
                  index === 0 ? 'bg-[#171717] border-l-2 border-l-[#E7B75A]' : ''
                }`}
              >
                <td className="py-2 px-3 text-[#F5F5F5] font-medium tabular-nums">
                  {formatHour(hour.time.toString())}
                </td>
                <td className="py-2 px-3 text-[#F5F5F5] tabular-nums font-semibold">
                  {Math.round(hour.temperature)}°C
                </td>
                <td className="py-2 px-3 text-[#737373] tabular-nums">
                  {Math.round(hour.feelsLike)}°C
                </td>
                <td className="py-2 px-3 flex items-center gap-2">
                  {getWeatherIcon(hour.weatherCode)}
                  <span className="text-[#A3A3A3] capitalize truncate max-w-[90px]">{hour.weatherDescription}</span>
                </td>
                <td className="py-2 px-3 text-[#7899B8] tabular-nums">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    {hour.precipitation.toFixed(1)}mm ({hour.precipitationProbability}%)
                  </span>
                </td>
                <td className="py-2 px-3 text-[#A3A3A3] tabular-nums">
                  {hour.humidity}%
                </td>
                <td className="py-2 px-3 text-[#E7B75A] tabular-nums">
                  <span className="flex items-center gap-1">
                    <Wind className="w-3 h-3" />
                    {hour.windSpeed} km/h {hour.windDirectionText}
                  </span>
                </td>
                <td className="py-2 px-3 text-[#A3A3A3] tabular-nums">
                  {hour.cloudCover}%
                </td>
                <td className="py-2 px-3 text-[#E7B75A] tabular-nums">
                  {hour.uvIndex}
                </td>
                <td className="py-2 px-3 text-[#737373] tabular-nums">
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
    <div className="space-y-2.5">
      <h4 className="text-[#F5F5F5] text-xs font-mono uppercase tracking-wider flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-[#E7B75A]" />
        7-Day Synoptic Outlook
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
    <div className={`p-3.5 rounded bg-[#101010] border transition-colors hover:border-[#383838] ${
      isToday ? 'border-l-2 border-l-[#E7B75A] border-[#2A2A2A] bg-[#141414]' : 'border-[#2A2A2A]'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
            {getWeatherIcon(data.weatherCode)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs font-medium ${isToday ? 'text-[#E7B75A]' : 'text-[#F5F5F5]'}`}>
                {isToday ? 'Today' : formatDay(data.date.toString())}
              </span>
              <span className="text-[#737373] text-xs truncate">{data.weatherDescription}</span>
            </div>
            <div className="flex items-center gap-3 text-[#737373] text-[10px] font-mono mt-0.5">
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-[#E7B75A]" />
                {formatTime(data.sunrise.toString())}
              </span>
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-[#E07A5F]" />
                {formatTime(data.sunset.toString())}
              </span>
              <span className="flex items-center gap-1">
                <SunIcon className="w-3 h-3 text-[#E7B75A]" />
                UV {data.uvIndexMax}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right flex-shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-base font-mono font-semibold text-[#F5F5F5] tabular-nums">{Math.round(data.temperatureMax)}°C</span>
            <span className="text-[#737373] text-xs font-mono tabular-nums">/{Math.round(data.temperatureMin)}°C</span>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-[10px] font-mono text-[#737373]">
            <div className="flex items-center gap-1 text-[#7899B8]">
              <Droplets className="w-3 h-3" />
              <span>{data.precipitationSum.toFixed(1)}mm ({data.precipitationProbabilityMax}%)</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-[#E7B75A]" />
              <span>{data.windSpeedMax} km/h {data.windDirectionText ?? ''}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="w-4 h-4 text-[#E7B75A]" />;
  if (code <= 3) return <Cloud className="w-4 h-4 text-[#A3A3A3]" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-4 h-4 text-[#7899B8]" />;
  if (code >= 71 && code <= 77) return <CloudSnow className="w-4 h-4 text-[#A3A3A3]" />;
  if (code >= 80 && code <= 82) return <CloudRain className="w-4 h-4 text-[#7899B8]" />;
  if (code >= 95) return <Zap className="w-4 h-4 text-[#E7B75A]" />;
  return <Cloud className="w-4 h-4 text-[#A3A3A3]" />;
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
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default Forecast;