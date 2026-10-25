import { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { WeatherLayerType, getWeatherLayerConfig } from '../../services/mapUtils';

interface MapLegendProps {
  activeLayer: WeatherLayerType;
}

export function MapLegend({ activeLayer }: MapLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const config = getWeatherLayerConfig(activeLayer);
  
  if (!config || activeLayer === 'none') return null;

  const colorStops = config.colorScale;
  const minVal = colorStops[0][0];
  const midVal = colorStops[Math.floor(colorStops.length / 2)][0];
  const maxVal = colorStops[colorStops.length - 1][0];
  const gradientCss = `linear-gradient(to right, ${colorStops.map(([_, c]) => c).join(', ')})`;

  return (
    <div className="absolute bottom-6 left-4 z-20 pointer-events-auto select-none">
      <div className="bg-[#0B1526]/90 border border-[#1E2E48] rounded-xl shadow-2xl shadow-black/50 backdrop-blur-md overflow-hidden min-w-[220px] transition-all">
        {/* Header */}
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{config.icon}</span>
            <div>
              <span className="text-white text-xs font-semibold">{config.label}</span>
              <span className="text-slate-400 text-[10px] ml-1.5 font-mono">({config.unit})</span>
            </div>
          </div>
          <button 
            className="text-slate-400 hover:text-white p-0.5 rounded"
            aria-label={isCollapsed ? 'Expand Legend' : 'Collapse Legend'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Gradient bar & labels */}
        {!isCollapsed && (
          <div className="px-3 pb-3 pt-1 border-t border-[#1E2E48]/50">
            <div 
              className="h-2.5 w-full rounded-full shadow-inner border border-white/10"
              style={{ background: gradientCss }}
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1.5 font-medium tabular-nums">
              <span>{minVal}{config.unit}</span>
              <span>{midVal}{config.unit}</span>
              <span>{maxVal}{config.unit}+</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}