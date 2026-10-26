import { 
  Thermometer, 
  CloudRain, 
  Droplets, 
  Wind, 
  Boxes, 
  Plus, 
  Minus, 
  RotateCcw,
} from 'lucide-react';
import type { WeatherLayerType, MapStyleId } from '../../services/mapUtils';

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
  is3D,
  onToggle3D,
  onZoomIn,
  onZoomOut,
  onResetView,
}: MapControlsProps) {
  const layers: { id: WeatherLayerType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'temperature', label: 'Temperature', icon: <Thermometer className="w-3.5 h-3.5" />, color: 'text-[#E7B75A]' },
    { id: 'rainfall', label: 'Rainfall', icon: <CloudRain className="w-3.5 h-3.5" />, color: 'text-[#7899B8]' },
    { id: 'humidity', label: 'Humidity', icon: <Droplets className="w-3.5 h-3.5" />, color: 'text-[#4E9F8E]' },
    { id: 'wind', label: 'Wind Speed', icon: <Wind className="w-3.5 h-3.5" />, color: 'text-[#E07A5F]' },
  ];

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none select-none">
      {/* 1. Weather Layer Switcher Pills */}
      <div className="flex items-center gap-1 p-1 bg-[#101010] border border-[#2A2A2A] rounded shadow-xl shadow-black/70 backdrop-blur-md pointer-events-auto">
        {layers.map((layer) => {
          const isActive = activeLayer === layer.id;
          return (
            <button
              key={layer.id}
              onClick={() => onLayerChange(layer.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/60 font-semibold'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#171717] border border-transparent'
              }`}
              title={`View ${layer.label} layer`}
            >
              <span className={isActive ? 'text-[#E7B75A]' : layer.color}>{layer.icon}</span>
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Quick Actions Group (3D, Reset, Zoom) */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <div className="flex items-center bg-[#101010] border border-[#2A2A2A] rounded p-1 shadow-lg shadow-black/60 backdrop-blur-md">
          {/* 3D / 2D Toggle */}
          <button
            onClick={onToggle3D}
            className={`px-2 py-1 rounded text-xs font-mono font-medium flex items-center gap-1 transition-colors ${
              is3D 
                ? 'bg-[#171717] text-[#E7B75A] font-semibold border border-[#E7B75A]/50' 
                : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#171717]'
            }`}
            title={is3D ? 'Reset to 2D Top-Down' : 'Enable 3D Perspective Tilt'}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>{is3D ? '3D' : '2D'}</span>
          </button>

          <div className="w-px h-3.5 bg-[#2A2A2A] mx-1" />

          {/* Reset Camera to India */}
          <button
            onClick={onResetView}
            className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
            title="Reset to Full India View"
            aria-label="Reset to India View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-[#2A2A2A] mx-1" />

          {/* Zoom In */}
          <button
            onClick={onZoomIn}
            className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={onZoomOut}
            className="p-1 rounded text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
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

export default MapControls;
