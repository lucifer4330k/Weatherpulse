import { 
  Droplets, 
  Wind, 
  Gauge, 
  Sun, 
  Cloud, 
  CloudRain, 
  Thermometer, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Waves,
  CloudSun,
  Sun as SunIcon,
  CloudSnow,
  Zap,
  Eye,
  Droplet,
  Compass,
  ArrowUpRight,
  ArrowDownLeft,
  Sunrise,
  Sunset,
} from 'lucide-react';
import type { WeatherDashboardData, CurrentWeather, HourlyForecast } from '../../types';
import { getUVIndexDescription, getWindSpeedDescription, getWindDirectionText } from '../../services/mapUtils';

interface CurrentConditionsProps {
  data: WeatherDashboardData | null;
}

export function CurrentConditions({ data }: CurrentConditionsProps) {
  const current = data?.current;
  const hourly = data?.hourly || [];

  if (!current) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800/50 flex items-center justify-center">
          <Thermometer className="w-8 h-8 text-neutral-500" />
        </div>
        <h3 className="text-neutral-400 font-medium">No current weather data</h3>
        <p className="text-neutral-500 text-sm mt-1">Weather information is not available for this location</p>
      </div>
    );
  }

  const weatherIcons: Record<string, React.ReactNode> = {
    clear: <SunIcon className="w-7 h-7 text-yellow-400" />,
    clouds: <Cloud className="w-7 h-7 text-neutral-300" />,
    rain: <CloudRain className="w-7 h-7 text-blue-400" />,
    snow: <CloudSnow className="w-7 h-7 text-blue-300" />,
    thunder: <Zap className="w-7 h-7 text-yellow-400" />,
    fog: <Cloud className="w-7 h-7 text-neutral-400" />,
    default: <Thermometer className="w-7 h-7 text-primary-400" />,
  };

  const getWeatherIcon = (code: number, isDay: boolean) => {
    if (code === 0) return isDay ? weatherIcons.clear : <Moon className="w-7 h-7 text-yellow-300" />;
    if (code <= 3) return weatherIcons.clouds;
    if (code >= 45 && code <= 48) return <Cloud className="w-7 h-7 text-neutral-400" />; // Fog
    if (code >= 51 && code <= 67) return weatherIcons.rain;
    if (code >= 71 && code <= 77) return weatherIcons.snow;
    if (code >= 80 && code <= 82) return weatherIcons.rain;
    if (code >= 95) return weatherIcons.thunder;
    return weatherIcons.default;
  };

  const isStoredObservation = current.source === 'cassandra';
  const sourceLabel = isStoredObservation ? 'Stored Stream Observation' : 'Open-Meteo Weather Model';
  const sourceIcon = isStoredObservation ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Info className="w-4 h-4 text-blue-400" />;

  const feelsLike = current.feelsLike;
  const windSpeed = current.windSpeed;
  const windDirection = current.windDirection;
  const windDirectionText = current.windDirectionText || getWindDirectionText(windDirection);
  const weatherDescription = current.weatherDescription;
  const weatherCode = current.weatherCode;
  const visibility = current.visibility;
  const cloudCover = current.cloudCover ?? 0;
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
    <div className="space-y-5 animate-fade-in">
      {/* Main Temperature Display */}
      <div className="glass-card relative overflow-hidden p-6">
        {/* Background gradient based on temperature */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-transparent" />
        
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-2 flex-wrap">
              <span className="weather-temp-lg leading-none">{Math.round(current.temperature)}°</span>
              <div className="flex flex-col">
                <span className="text-body-lg font-medium text-neutral-200">{weatherDescription}</span>
                <span className="text-capitalize text-caption">{getWeatherDescription(weatherCode)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-neutral-500 text-sm flex-wrap">
              {sourceIcon}
              <span>{sourceLabel}</span>
              <span className="text-neutral-700">•</span>
              <span>Updated {formatRelativeTime(current.time.toString())}</span>
              {current.isDay !== undefined && current.isDay !== null && (
                <>
                  <span className="text-neutral-700">•</span>
                  <span className="flex items-center gap-1">
                    {current.isDay ? <SunIcon className="w-3.5 h-3.5 text-yellow-400" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
                    {current.isDay ? 'Daytime' : 'Nighttime'}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-400/10 flex items-center justify-center backdrop-blur-sm border border-primary-500/20">
            {getWeatherIcon(weatherCode, current.isDay)}
          </div>
        </div>

        {/* Feels like & Trend */}
        <div className="mt-4 pt-4 border-t border-neutral-800/50 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 text-neutral-500">
            <Thermometer className="w-5 h-5" />
            <span className="text-sm">Feels like</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-white tabular-nums">{Math.round(feelsLike)}°</span>
            <div className={`flex items-center gap-1 text-sm font-medium ${tempTrend > 0.5 ? 'text-green-400' : tempTrend < -0.5 ? 'text-red-400' : 'text-neutral-500'}`}>
              {tempTrend > 0.5 && <ArrowUpRight className="w-4 h-4" />}
              {tempTrend < -0.5 && <ArrowDownLeft className="w-4 h-4" />}
              <span>{tempTrend > 0 ? '+' : ''}{tempTrend.toFixed(1)}°/hr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Details Grid - Primary Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <WeatherDetailCard
          icon={<Droplets className="w-5 h-5 text-blue-400" />}
          label="Humidity"
          value={`${humidity}%`}
          description={getHumidityDescription(humidity)}
        />
        <WeatherDetailCard
          icon={<Wind className="w-5 h-5 text-green-400" />}
          label="Wind"
          value={`${windSpeed} km/h`}
          description={`${windDirectionText} (${windDirection}°) • ${windInfo.label}`}
        />
        <WeatherDetailCard
          icon={<Gauge className="w-5 h-5 text-yellow-400" />}
          label="Pressure"
          value={`${pressure} hPa`}
          description={getPressureDescription(pressure)}
        />
        <WeatherDetailCard
          icon={<CloudRain className="w-5 h-5 text-cyan-400" />}
          label="Precipitation"
          value={`${precipitation} mm`}
          description={getPrecipitationDescription(precipitation)}
        />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <WeatherDetailCard
          icon={<Eye className="w-5 h-5 text-purple-400" />}
          label="Visibility"
          value={visibility == null ? 'N/A' : `${visibility.toFixed(1)} km`}
          description={visibility == null ? 'Data unavailable' : getVisibilityDescription(visibility)}
        />
        <WeatherDetailCard
          icon={<Cloud className="w-5 h-5 text-indigo-400" />}
          label="Cloud Cover"
          value={`${cloudCover}%`}
          description={getCloudCoverDescription(cloudCover)}
        />
        <WeatherDetailCard
          icon={<SunIcon className="w-5 h-5 text-orange-400" />}
          label="UV Index"
          value={uvIndex == null ? 'N/A' : `${uvIndex}`}
          description={uvInfo ? `${uvInfo.label} • ${uvInfo.protection}` : 'Data unavailable'}
          valueColor={uvInfo?.color}
        />
        <WeatherDetailCard
          icon={<Droplet className="w-5 h-5 text-emerald-400" />}
          label="Dew Point"
          value={`${calculateDewPoint(current.temperature, humidity).toFixed(1)}°`}
          description={getDewPointDescription(calculateDewPoint(current.temperature, humidity))}
        />
      </div>

      {/* Wind Details Card */}
      <div className="glass-card p-5">
        <h4 className="text-neutral-200 font-medium mb-4 flex items-center gap-2">
          <Wind className="w-4 h-4 text-green-400" />
          Wind Details
        </h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-center p-4 bg-neutral-800/50 rounded-xl">
            <p className="text-neutral-500 text-xs mb-1 uppercase tracking-wider">Speed</p>
            <p className="text-white font-semibold text-xl tabular-nums">{windSpeed} km/h</p>
            <p className="text-neutral-500 text-xs">{windInfo.label} (Beaufort {windInfo.beaufort})</p>
          </div>
          <div className="text-center p-4 bg-neutral-800/50 rounded-xl relative">
            <p className="text-neutral-500 text-xs mb-1 uppercase tracking-wider">Direction</p>
            <p className="text-white font-semibold text-xl tabular-nums">{windDirectionText}</p>
            <p className="text-neutral-500 text-xs">{windDirection}° from North</p>
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-neutral-700 flex items-center justify-center">
              <div className="w-1.5 h-6 bg-green-400 rounded-t-full transform" style={{ transform: `rotate(${windDirection}deg)` }} />
            </div>
          </div>
          <div className="text-center p-4 bg-neutral-800/50 rounded-xl">
            <p className="text-neutral-500 text-xs mb-1 uppercase tracking-wider">Gust</p>
            <p className="text-white font-semibold text-xl tabular-nums">{(current as any).wind_gust ? `${(current as any).wind_gust} km/h` : 'N/A'}</p>
            <p className="text-neutral-500 text-xs">Peak gust speed</p>
          </div>
        </div>
      </div>

      {/* Sun Times Card */}
      {(current as any).sunrise && (current as any).sunset && (
        <div className="glass-card p-5">
          <h4 className="text-neutral-200 font-medium mb-4 flex items-center gap-2">
            <SunIcon className="w-4 h-4 text-yellow-400" />
            Sun & Moon
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-4 bg-neutral-800/50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Sunrise className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase tracking-wider">Sunrise</p>
                <p className="text-white font-medium">{formatTime((current as any).sunrise)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-neutral-800/50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Sunset className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase tracking-wider">Sunset</p>
                <p className="text-white font-medium">{formatTime((current as any).sunset)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hourly Precipitation Forecast */}
      {hourly.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="text-neutral-200 font-medium mb-4 flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-cyan-400" />
            Next 12 Hours Precipitation
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {hourly.slice(0, 12).map((hour, index) => (
              <div key={index} className="flex-shrink-0 flex flex-col items-center gap-1.5 min-w-[52px]">
                <span className="text-xs text-neutral-500 font-mono tabular-nums">{formatHour(hour.time.toString())}</span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-800/50 border border-neutral-700/50 transition-colors hover:border-primary-500/30">
                  {hour.precipitation > 0 ? (
                    <CloudRain className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <span className="text-xs text-neutral-500">—</span>
                  )}
                </div>
                <span className="text-xs text-white font-medium tabular-nums">
                  {hour.precipitation > 0 ? `${hour.precipitation.toFixed(1)}mm` : '—'}
                </span>
                {hour.precipitationProbability > 0 && (
                  <span className="text-xs text-blue-400 font-medium">{hour.precipitationProbability}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Source & Quality */}
      <div className="glass-card p-4 border-t border-neutral-800/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-neutral-500">
            <Info className="w-4 h-4" />
            <span>Data source: {current.source === 'cassandra' ? 'Stored Stream Observation' : 'Open-Meteo Model'}</span>
          </div>
          <div className="flex items-center gap-3 text-neutral-500 font-mono tabular-nums text-xs">
            <span>Lat: {current.latitude?.toFixed(4) ?? 'N/A'}</span>
            <span>Lon: {current.longitude?.toFixed(4) ?? 'N/A'}</span>
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
    <div className="glass-card-hover p-4 group">
      <div className="flex items-center gap-2 text-neutral-500 text-sm mb-2">
        {icon}
        <span className="font-medium text-neutral-300 group-hover:text-white transition-colors">{label}</span>
      </div>
      <p className="weather-detail-value" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="text-capitalize mt-1 line-clamp-2">{description}</p>
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

function getPressureDescription(pressure: number): string {
  if (pressure < 1000) return 'Low pressure - stormy';
  if (pressure < 1010) return 'Below normal';
  if (pressure < 1020) return 'Normal';
  if (pressure < 1030) return 'High pressure - fair weather';
  return 'Very high pressure';
}

function getPrecipitationDescription(precip: number): string {
  if (precip === 0) return 'No precipitation';
  if (precip < 2.5) return 'Light rain/drizzle';
  if (precip < 10) return 'Moderate rain';
  if (precip < 50) return 'Heavy rain';
  return 'Very heavy rain';
}

function getVisibilityDescription(vis: number): string {
  if (vis < 1) return 'Very poor - fog';
  if (vis < 5) return 'Poor';
  if (vis < 10) return 'Moderate';
  return 'Good';
}

function getCloudCoverDescription(cover: number): string {
  if (cover === 0) return 'Clear sky';
  if (cover < 25) return 'Few clouds';
  if (cover < 50) return 'Partly cloudy';
  if (cover < 75) return 'Mostly cloudy';
  return 'Overcast';
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

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
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
