import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  const gradientCss = `linear-gradient(to right, ${colorStops.map(([colorVal]) => colorVal).join(', ')})`;

  return (
    <div className="absolute bottom-6 left-4 z-20 pointer-events-auto select-none font-sans">
      <div className="bg-[#101010] border border-[#2A2A2A] rounded shadow-2xl shadow-black/70 backdrop-blur-md overflow-hidden min-w-[210px] transition-all">
        {/* Header */}
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#171717] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs leading-none">{config.icon}</span>
            <div>
              <span className="text-[#F5F5F5] text-xs font-semibold">{config.label}</span>
              <span className="text-[#737373] text-[10px] ml-1.5 font-mono">({config.unit})</span>
            </div>
          </div>
          <button 
            className="text-[#737373] hover:text-[#F5F5F5] p-0.5 rounded"
            aria-label={isCollapsed ? 'Expand Legend' : 'Collapse Legend'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Gradient bar & labels */}
        {!isCollapsed && (
          <div className="px-3 pb-2.5 pt-1 border-t border-[#2A2A2A]">
            <div 
              className="h-2 w-full rounded shadow-inner border border-white/10"
              style={{ background: gradientCss }}
            />
            <div className="flex justify-between items-center text-[10px] text-[#A3A3A3] font-mono mt-1 font-medium tabular-nums">
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

export default MapLegend;