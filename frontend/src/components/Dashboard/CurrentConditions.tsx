import { 
  Wind, 
  Gauge, 
  Cloud, 
  CloudRain, 
  Thermometer, 
  CheckCircle, 
  Info,
  Sun as SunIcon,
  CloudSnow,
  Zap,
  Eye,
  Droplet,
  ArrowUpRight,
  ArrowDownLeft,
  Sunrise,
  Sunset,
} from 'lucide-react';
import type { WeatherDashboardData } from '../../types';
import { getUVIndexDescription, getWindSpeedDescription, getWindDirectionText } from '../../services/mapUtils';

interface CurrentConditionsProps {
  data: WeatherDashboardData | null;
}

export function CurrentConditions({ data }: CurrentConditionsProps) {
  const current = data?.current;
  const hourly = data?.hourly || [];
  const today = data?.daily?.[0];

  if (!current) {
    return (
      <div className="bg-[#101010] border border-[#2A2A2A] rounded p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center">
          <Thermometer className="w-6 h-6 text-[#737373]" />
        </div>
        <h3 className="text-[#A3A3A3] font-medium text-sm">No current weather data</h3>
        <p className="text-[#737373] text-xs mt-1">Weather observation is not available for this location</p>
      </div>
    );
  }

  const weatherIcons: Record<string, React.ReactNode> = {
    clear: <SunIcon className="w-6 h-6 text-[#E7B75A]" />,
    clouds: <Cloud className="w-6 h-6 text-[#A3A3A3]" />,
    rain: <CloudRain className="w-6 h-6 text-[#7899B8]" />,
    snow: <CloudSnow className="w-6 h-6 text-[#A3A3A3]" />,
    thunder: <Zap className="w-6 h-6 text-[#E7B75A]" />,
    fog: <Cloud className="w-6 h-6 text-[#737373]" />,
    default: <Thermometer className="w-6 h-6 text-[#E7B75A]" />,
  };

  const getWeatherIcon = (code: number, isDay: boolean) => {
    if (code === 0) return isDay ? weatherIcons.clear : <Moon className="w-6 h-6 text-[#E7B75A]" />;
    if (code <= 3) return weatherIcons.clouds;
    if (code >= 45 && code <= 48) return <Cloud className="w-6 h-6 text-[#737373]" />;
    if (code >= 51 && code <= 67) return weatherIcons.rain;
    if (code >= 71 && code <= 77) return weatherIcons.snow;
    if (code >= 80 && code <= 82) return weatherIcons.rain;
    if (code >= 95) return weatherIcons.thunder;
    return weatherIcons.default;
  };

  const isStoredObservation = current.source === 'cassandra';
  const sourceLabel = isStoredObservation ? 'Cassandra Stored Observation' : 'Open-Meteo Model';
  const sourceIcon = isStoredObservation 
    ? <CheckCircle className="w-3.5 h-3.5 text-[#3EA874]" /> 
    : <Info className="w-3.5 h-3.5 text-[#E7B75A]" />;

  const feelsLike = current.feelsLike;
  const windSpeed = current.windSpeed;
  const windDirection = current.windDirection;
  const windDirectionText = current.windDirectionText || getWindDirectionText(windDirection);
  const weatherDescription = current.weatherDescription;
  const weatherCode = current.weatherCode;
  const visibility = current.visibility;
  const cloudCover = current.cloudCover;
  const uvIndex = current.uvIndex;
  const precipitation = current.precipitation;
  const pressure = current.pressure;
  const humidity = current.humidity;

  const uvInfo = uvIndex == null ? null : getUVIndexDescription(uvIndex);
  const windInfo = getWindSpeedDescription(windSpeed);

  // Get next few hours for trend
  const nextHours = hourly.slice(0, 6);
  const tempTrend = nextHours.length > 1 ? nextHours[1].temperature - nextHours[0].temperature : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Main Temperature Display */}
      <div className="bg-[#101010] border border-[#2A2A2A] border-t-2 border-t-[#E7B75A] rounded p-5 relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-2 flex-wrap">
              <span className="text-4xl font-mono font-semibold text-[#F5F5F5] leading-none tracking-tight">
                {Math.round(current.temperature)}°C
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#F5F5F5]">{weatherDescription}</span>
                <span className="text-xs text-[#737373]">{getWeatherDescription(weatherCode)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[#737373] text-xs flex-wrap font-mono">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#171717] border border-[#2A2A2A]">
                {sourceIcon}
                <span className="text-[#A3A3A3]">{sourceLabel}</span>
              </span>
              {current.isDay !== undefined && current.isDay !== null && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171717] border border-[#2A2A2A] text-[#A3A3A3]">
                  {current.isDay ? <SunIcon className="w-3 h-3 text-[#E7B75A]" /> : <Moon className="w-3 h-3 text-[#A3A3A3]" />}
                  {current.isDay ? 'Day' : 'Night'}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 w-14 h-14 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center">
            {getWeatherIcon(weatherCode, current.isDay)}
          </div>
        </div>

        {/* Feels like & Trend */}
        <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 text-[#737373] text-xs">
            <Thermometer className="w-4 h-4 text-[#A3A3A3]" />
            <span>Feels like</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-semibold text-[#F5F5F5] tabular-nums">{Math.round(feelsLike)}°C</span>
            <div className={`flex items-center gap-1 text-xs font-mono font-medium ${tempTrend > 0.5 ? 'text-[#3EA874]' : tempTrend < -0.5 ? 'text-[#D9534F]' : 'text-[#737373]'}`}>
              {tempTrend > 0.5 && <ArrowUpRight className="w-3.5 h-3.5" />}
              {tempTrend < -0.5 && <ArrowDownLeft className="w-3.5 h-3.5" />}
              <span>{tempTrend > 0 ? '+' : ''}{tempTrend.toFixed(1)}°/hr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Details Grid - Primary Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        <WeatherDetailCard
          icon={<Droplet className="w-4 h-4 text-[#4E9F8E]" />}
          label="Humidity"
          value={`${humidity}%`}
          description={getHumidityDescription(humidity)}
        />
        <WeatherDetailCard
          icon={<Wind className="w-4 h-4 text-[#E7B75A]" />}
          label="Wind"
          value={`${windSpeed.toFixed(1)} km/h`}
          description={`${windDirectionText} (${windDirection}°) • ${windInfo.label}`}
        />
        <WeatherDetailCard
          icon={<Gauge className="w-4 h-4 text-[#A3A3A3]" />}
          label="Pressure"
          value={`${pressure.toFixed(1)} hPa`}
          description="Surface pressure at this elevation"
        />
        <WeatherDetailCard
          icon={<CloudRain className="w-4 h-4 text-[#7899B8]" />}
          label="Precipitation"
          value={`${precipitation.toFixed(1)} mm`}
          description={getPrecipitationDescription(precipitation)}
        />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <WeatherDetailCard
          icon={<Eye className="w-4 h-4 text-[#A3A3A3]" />}
          label="Visibility"
          value={visibility == null ? 'N/A' : `${visibility.toFixed(1)} km`}
          description={visibility == null ? 'Data unavailable' : getVisibilityDescription(visibility)}
        />
        <WeatherDetailCard
          icon={<Cloud className="w-4 h-4 text-[#A3A3A3]" />}
          label="Cloud Cover"
          value={cloudCover == null ? 'N/A' : `${cloudCover}%`}
          description={cloudCover == null ? 'Data unavailable' : getCloudCoverDescription(cloudCover)}
        />
        <WeatherDetailCard
          icon={<SunIcon className="w-4 h-4 text-[#E7B75A]" />}
          label="UV Index"
          value={uvIndex == null ? 'N/A' : `${uvIndex}`}
          description={uvInfo ? `${uvInfo.label} • ${uvInfo.protection}` : 'Data unavailable'}
        />
        <WeatherDetailCard
          icon={<Droplet className="w-4 h-4 text-[#4E9F8E]" />}
          label="Dew Point"
          value={`${calculateDewPoint(current.temperature, humidity).toFixed(1)}°C`}
          description={getDewPointDescription(calculateDewPoint(current.temperature, humidity))}
        />
      </div>

      {/* Wind Details Card */}
      <div className="bg-[#101010] border border-[#2A2A2A] rounded p-4">
        <h4 className="text-[#F5F5F5] text-xs font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-[#E7B75A]" />
          Wind Vector & Velocity
        </h4>
        <div className="grid grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 bg-[#171717] border border-[#222222] rounded">
            <p className="text-[#737373] text-[10px] font-mono uppercase tracking-wider mb-1">Speed</p>
            <p className="text-[#F5F5F5] font-mono font-semibold text-base tabular-nums">{windSpeed.toFixed(1)} km/h</p>
            <p className="text-[#737373] text-[10px] mt-0.5">{windInfo.label}</p>
          </div>
          <div className="p-3 bg-[#171717] border border-[#222222] rounded relative">
            <p className="text-[#737373] text-[10px] font-mono uppercase tracking-wider mb-1">Direction</p>
            <p className="text-[#F5F5F5] font-mono font-semibold text-base tabular-nums">{windDirectionText}</p>
            <p className="text-[#737373] text-[10px] mt-0.5">{windDirection}° N</p>
            <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full border border-[#2A2A2A] flex items-center justify-center">
              <div className="w-1 h-3.5 bg-[#E7B75A] rounded-t-full transform" style={{ transform: `rotate(${windDirection}deg)` }} />
            </div>
          </div>
          <div className="p-3 bg-[#171717] border border-[#222222] rounded">
            <p className="text-[#737373] text-[10px] font-mono uppercase tracking-wider mb-1">Peak Gust</p>
            <p className="text-[#F5F5F5] font-mono font-semibold text-base tabular-nums">{current.windGust == null ? 'N/A' : `${current.windGust.toFixed(1)} km/h`}</p>
            <p className="text-[#737373] text-[10px] mt-0.5">{current.windGust == null ? 'Not reported' : 'Observed gust'}</p>
          </div>
        </div>
      </div>

      {/* Sun Times Card */}
      {today?.sunrise && today?.sunset && (
        <div className="bg-[#101010] border border-[#2A2A2A] rounded p-4">
          <h4 className="text-[#F5F5F5] text-xs font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
            <SunIcon className="w-3.5 h-3.5 text-[#E7B75A]" />
            Solar Ephemeris
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-3 p-3 bg-[#171717] border border-[#222222] rounded">
              <div className="w-8 h-8 rounded bg-[#202020] border border-[#2A2A2A] flex items-center justify-center">
                <Sunrise className="w-4 h-4 text-[#E7B75A]" />
              </div>
              <div>
                <p className="text-[#737373] text-[10px] font-mono uppercase tracking-wider">Sunrise</p>
                <p className="text-[#F5F5F5] font-mono text-xs font-medium">{formatTime(today.sunrise)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#171717] border border-[#222222] rounded">
              <div className="w-8 h-8 rounded bg-[#202020] border border-[#2A2A2A] flex items-center justify-center">
                <Sunset className="w-4 h-4 text-[#E07A5F]" />
              </div>
              <div>
                <p className="text-[#737373] text-[10px] font-mono uppercase tracking-wider">Sunset</p>
                <p className="text-[#F5F5F5] font-mono text-xs font-medium">{formatTime(today.sunset)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hourly Precipitation Forecast */}
      {hourly.length > 0 && (
        <div className="bg-[#101010] border border-[#2A2A2A] rounded p-4">
          <h4 className="text-[#F5F5F5] text-xs font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
            <CloudRain className="w-3.5 h-3.5 text-[#7899B8]" />
            12-Hour Precipitation Forecast
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {hourly.slice(0, 12).map((hour, index) => (
              <div key={index} className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[56px] p-2 bg-[#171717] border border-[#222222] rounded">
                <span className="text-[10px] text-[#737373] font-mono tabular-nums">{formatHour(hour.time.toString())}</span>
                <div className="w-7 h-7 rounded flex items-center justify-center text-[#7899B8]">
                  {hour.precipitation > 0 ? (
                    <CloudRain className="w-4 h-4 text-[#7899B8]" />
                  ) : (
                    <span className="text-xs text-[#555555]">—</span>
                  )}
                </div>
                <span className="text-[11px] text-[#F5F5F5] font-mono font-medium tabular-nums">
                  {hour.precipitation > 0 ? `${hour.precipitation.toFixed(1)}mm` : '0 mm'}
                </span>
                {hour.precipitationProbability > 0 && (
                  <span className="text-[10px] text-[#7899B8] font-mono">{hour.precipitationProbability}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Source & Location */}
      <div className="bg-[#101010] border border-[#2A2A2A] rounded p-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-[#737373]">
            <Info className="w-3.5 h-3.5 text-[#E7B75A]" />
            <span>Source: {current.source === 'cassandra' ? 'Cassandra Ingest' : 'Open-Meteo'}</span>
          </div>
          <div className="flex items-center gap-3 text-[#737373] tabular-nums text-[11px]">
            <span>Lat: {(current.latitude ?? data?.location.lat)?.toFixed(4) ?? 'N/A'}</span>
            <span>Lon: {(current.longitude ?? data?.location.lon)?.toFixed(4) ?? 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Weather Detail Card Component
function WeatherDetailCard({ icon, label, value, description, valueColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-[#101010] border border-[#2A2A2A] rounded p-3 hover:border-[#383838] transition-colors">
      <div className="flex items-center gap-2 text-[#737373] text-xs mb-1.5">
        {icon}
        <span className="font-mono text-[#A3A3A3] text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-mono font-semibold text-[#F5F5F5] tabular-nums" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="text-[11px] text-[#737373] mt-1 line-clamp-1">{description}</p>
    </div>
  );
}

// Helper functions
function getHumidityDescription(humidity: number): string {
  if (humidity < 30) return 'Very dry air';
  if (humidity < 50) return 'Comfortable';
  if (humidity < 70) return 'Moderately humid';
  if (humidity < 85) return 'Humid';
  return 'Very humid';
}

function getPrecipitationDescription(precip: number): string {
  if (precip === 0) return 'No observed rain';
  if (precip < 2.5) return 'Light drizzle';
  if (precip < 10) return 'Moderate rain';
  if (precip < 50) return 'Heavy rain';
  return 'Torrential rain';
}

function getVisibilityDescription(vis: number): string {
  if (vis < 1) return 'Severe fog';
  if (vis < 5) return 'Poor visibility';
  if (vis < 10) return 'Moderate visibility';
  return 'Clear line of sight';
}

function getCloudCoverDescription(cover: number): string {
  if (cover === 0) return 'Clear sky';
  if (cover < 25) return 'Scattered clouds';
  if (cover < 50) return 'Partly cloudy';
  if (cover < 75) return 'Mostly cloudy';
  return 'Overcast conditions';
}

function getDewPointDescription(dewPoint: number): string {
  if (dewPoint < 0) return 'Very dry';
  if (dewPoint < 10) return 'Dry';
  if (dewPoint < 16) return 'Comfortable';
  if (dewPoint < 21) return 'Humid';
  if (dewPoint < 24) return 'Very humid';
  return 'Oppressive';
}

function calculateDewPoint(temp: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * temp) / (b + temp) + Math.log(humidity / 100);
  return (b * alpha) / (a - alpha);
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHour(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] || 'Unknown';
}

// Moon icon component
function Moon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

export default CurrentConditions;
