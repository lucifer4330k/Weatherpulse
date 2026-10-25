import { useState, useEffect, useMemo } from 'react';
import { getWeatherLayerConfig } from '../../services/mapUtils';

export function MapLegend() {
  // For now use local state, will be replaced with store
  const [weatherLayer, setWeatherLayer] = useState<'temperature' | 'rainfall' | 'humidity' | 'wind' | 'none'>('temperature');

  // Listen for weather layer changes
  useEffect(() => {
    const handleWeatherLayerChange = (e: CustomEvent) => {
      setWeatherLayer(e.detail);
    };
    window.addEventListener('weather-layer-change', handleWeatherLayerChange as EventListener);
    return () => window.removeEventListener('weather-layer-change', handleWeatherLayerChange as EventListener);
  }, []);

  const config = getWeatherLayerConfig(weatherLayer);
  
  if (!config || weatherLayer === 'none') return null;

  const colorStops = useMemo(() => {
    const stops = config.colorScale;
    if (stops.length < 2) return [];
    
    const result = [];
    const minVal = stops[0][0];
    const maxVal = stops[stops.length - 1][0];
    
    for (let i = 0; i < 6; i++) {
      const ratio = i / 5;
      const val = minVal + ratio * (maxVal - minVal);
      
      let color = stops[0][1];
      for (let j = 0; j < stops.length - 1; j++) {
        const [v1, c1] = stops[j];
        const [v2, c2] = stops[j + 1];
        if (val >= v1 && val <= v2) {
          const t = (val - v1) / (v2 - v1);
          color = interpolateColor(c1, c2, t);
          break;
        }
      }
      result.push({ value: Math.round(val), color });
    }
    return result;
  }, [config.colorScale]);

  function interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    if (!c1 || !c2) return color1;
    
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  return (
    <div className="glass-panel rounded-2xl border border-neutral-800/50 shadow-xl shadow-neutral-950/30 p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center">
          <span className="text-white text-lg">{config.icon}</span>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm">{config.label}</h4>
          <p className="text-neutral-500 text-xs">{config.description}</p>
        </div>
      </div>

      {/* Gradient bar */}
      <div className="relative mb-3">
        <div 
          className="h-3 w-full rounded-full overflow-hidden"
          style={{
            background: `linear-gradient(to right, ${config.colorScale.map(([_, c]) => c).join(', ')})`
          }}
        />
        <div className="flex justify-between text-xs text-neutral-500 font-mono tabular-nums mt-1">
          <span>{colorStops[0]?.value}{config.unit}</span>
          <span>{colorStops[2]?.value}{config.unit}</span>
          <span>{colorStops[5]?.value}{config.unit}</span>
        </div>
      </div>

      {/* Discrete steps */}
      <div className="space-y-2">
        {config.colorScale.slice(0, -1).map(([val, color], idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded border border-neutral-700/50" style={{ backgroundColor: color }} />
            <span className="text-neutral-300 text-sm font-mono tabular-nums">
              {val}{config.unit} – {config.colorScale[idx + 1][0]}{config.unit}
            </span>
          </div>
        ))}
        {/* Last value */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded border border-neutral-700/50" style={{ backgroundColor: config.colorScale[config.colorScale.length - 1][1] }} />
          <span className="text-neutral-300 text-sm font-mono tabular-nums">
            {config.colorScale[config.colorScale.length - 1][0]}+ {config.unit}
          </span>
        </div>
      </div>

      {/* Data source attribution */}
      <div className="mt-4 pt-3 border-t border-neutral-800/50">
        <p className="text-neutral-500 text-xs flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-primary-500/50" />
          Data: Open-Meteo & Cassandra
        </p>
      </div>
    </div>
  );
}

// Interpolate between two hex colors
function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export default MapLegend;