import { useState } from 'react';
import { 
  Thermometer, 
  CloudRain, 
  Droplets, 
  Wind, 
  Boxes, 
  Compass, 
  Plus, 
  Minus, 
  RotateCcw,
  Layers,
  Satellite,
  Info
} from 'lucide-react';
import { WeatherLayerType, MapStyleId, WEATHER_LAYERS } from '../../services/mapUtils';
import { useAppStore } from '../../store/useAppStore';

interface MapControlsProps {
  activeLayer: WeatherLayerType;
  onLayerChange: (layer: WeatherLayerType) => void;
  activeStyle: MapStyleId;
  onStyleChange: (style: MapStyleId) => void;
  is3D: boolean;
  onToggle3D: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export function MapControls({
  activeLayer,
  onLayerChange,
  activeStyle,
  onStyleChange,
  is3D,
  onToggle3D,
  onZoomIn,
  onZoomOut,
  onResetView,
}: MapControlsProps) {
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const layers: { id: WeatherLayerType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'temperature', label: 'Temperature', icon: <Thermometer className="w-3.5 h-3.5" />, color: 'text-amber-400' },
    { id: 'rainfall', label: 'Rainfall', icon: <CloudRain className="w-3.5 h-3.5" />, color: 'text-sky-400' },
    { id: 'humidity', label: 'Humidity', icon: <Droplets className="w-3.5 h-3.5" />, color: 'text-teal-400' },
    { id: 'wind', label: 'Wind Speed', icon: <Wind className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
  ];

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2.5 pointer-events-none select-none">
      {/* 1. Weather Layer Switcher Pills */}
      <div className="flex items-center gap-1 p-1 bg-[#0B1526]/90 border border-[#1E2E48] rounded-xl shadow-xl shadow-black/40 backdrop-blur-md pointer-events-auto">
        {layers.map((layer) => {
          const isActive = activeLayer === layer.id;
          return (
            <button
              key={layer.id}
              onClick={() => onLayerChange(layer.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }`}
              title={`View ${layer.label} layer`}
            >
              <span className={isActive ? 'text-cyan-400' : layer.color}>{layer.icon}</span>
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Quick Actions Group (3D, Reset, Zoom) */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <div className="flex items-center bg-[#0B1526]/90 border border-[#1E2E48] rounded-xl p-1 shadow-lg shadow-black/40 backdrop-blur-md">
          {/* 3D / 2D Toggle */}
          <button
            onClick={onToggle3D}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              is3D 
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title={is3D ? 'Reset to 2D Top-Down' : 'Enable 3D Perspective Tilt'}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>{is3D ? '3D' : '2D'}</span>
          </button>

          <div className="w-px h-4 bg-[#1E2E48] mx-1" />

          {/* Reset Camera to India */}
          <button
            onClick={onResetView}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            title="Reset to Full India View"
            aria-label="Reset to India View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-[#1E2E48] mx-1" />

          {/* Zoom In / Out */}
          <button
            onClick={onZoomIn}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
