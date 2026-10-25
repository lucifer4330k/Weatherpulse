import { useState, useRef, useEffect } from 'react';
import { 
  Sun, 
  CloudRain, 
  Droplets, 
  Wind, 
  Layers, 
  X, 
  ChevronDown,
  Mountain,
} from 'lucide-react';
import { WeatherLayerType, WEATHER_LAYERS, getWeatherLayerConfig, MAP_STYLES, MapStyleId } from '../../services/mapUtils';

export function WeatherLayerSelector() {
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [localMapStyle, setLocalMapStyle] = useState<'dark' | 'satellite' | 'hybrid'>('dark');
  const [localWeatherLayer, setLocalWeatherLayer] = useState<'temperature' | 'rainfall' | 'humidity' | 'wind' | 'none'>('temperature');
  const [localShowTerrain, setLocalShowTerrain] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLayerChange = (layer: 'temperature' | 'rainfall' | 'humidity' | 'wind' | 'none') => {
    setLocalWeatherLayer(layer);
    // Dispatch custom event for MapContainer to handle
    window.dispatchEvent(new CustomEvent('weather-layer-change', { detail: layer }));
  };

  const handleStyleChange = (style: 'dark' | 'satellite' | 'hybrid') => {
    setLocalMapStyle(style);
    window.dispatchEvent(new CustomEvent('map-style-change', { detail: style }));
  };

  const handleTerrainToggle = () => {
    const newValue = !localShowTerrain;
    setLocalShowTerrain(newValue);
    window.dispatchEvent(new CustomEvent('terrain-toggle', { detail: newValue }));
  };

  const MAP_STYLES = [
    { id: 'dark', label: 'Dark', description: 'Dark canvas for data viz' },
    { id: 'satellite', label: 'Satellite', description: 'Real satellite imagery' },
    { id: 'hybrid', label: 'Hybrid', description: 'Satellite with labels' },
  ] as const;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main button */}
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(!isExpanded)}
        className="glass-panel p-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-neutral-950/30 transition-all duration-200 hover:scale-105 active:scale-95 group"
        aria-expanded={isExpanded}
        aria-haspopup="listbox"
        aria-label="Map layers and style"
        title="Map Layers & Style"
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
          <Layers className="w-5 h-5 text-white" />
        </div>
        {isExpanded && (
          <div className="flex items-center gap-2 text-neutral-300 text-sm font-medium hidden sm:block">
            <span className="capitalize">{getWeatherLayerConfig(localWeatherLayer)?.label || 'None'}</span>
            <ChevronDown className="w-4 h-4 transition-transform group-data-[expanded=true]:rotate-180" />
          </div>
        )}
      </button>

      {/* Dropdown panel */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 w-72 glass-panel rounded-2xl border border-neutral-800/50 shadow-2xl shadow-neutral-950/50 overflow-hidden animate-slide-up z-50">
          {/* Header */}
          <div className="p-4 border-b border-neutral-800/50">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary-400" />
                Map Layers & Style
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800/50 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weather Layer Section */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-neutral-400 text-xs font-medium uppercase tracking-wider">Weather Overlay</h4>
              <span className="text-neutral-500 text-xs">{getWeatherLayerConfig(localWeatherLayer)?.label || 'None'}</span>
            </div>
            
            <div className="space-y-2" role="listbox" aria-label="Weather overlay">
              {[...WEATHER_LAYERS, { id: 'none' as const, label: 'None', icon: '✕', description: 'No weather overlay', colorScale: [], unit: '', dataField: '', tooltipFormatter: () => '' }].map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => { handleLayerChange(layer.id); setIsExpanded(false); }}
                  role="option"
                  aria-selected={localWeatherLayer === layer.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    localWeatherLayer === layer.id
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'text-neutral-300 hover:bg-neutral-800/50 hover:text-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-neutral-800/50">
                    {layer.icon}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm truncate">{layer.label}</p>
                    <p className="text-neutral-500 text-xs truncate">{layer.description}</p>
                  </div>
                  {localWeatherLayer === layer.id && (
                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-800/50 my-2" />

          {/* Map Style Section */}
          <div className="p-4 space-y-3">
            <h4 className="text-neutral-400 text-xs font-medium uppercase tracking-wider">Map Style</h4>
            
            <div className="space-y-2" role="radiogroup" aria-label="Map style">
              {[
                { id: 'dark', label: 'Dark', description: 'Dark canvas for data visualization', icon: '🌙' },
                { id: 'satellite', label: 'Satellite', description: 'Real satellite imagery', icon: '🛰️' },
                { id: 'hybrid', label: 'Hybrid', description: 'Satellite with labels', icon: '🗺️' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => { handleStyleChange(style.id as 'dark' | 'satellite' | 'hybrid'); setIsExpanded(false); }}
                  role="radio"
                  aria-checked={localMapStyle === style.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    localMapStyle === style.id
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'text-neutral-300 hover:bg-neutral-800/50 hover:text-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-neutral-800/50">
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm truncate">{style.label}</p>
                    <p className="text-neutral-500 text-xs truncate">{style.description}</p>
                  </div>
                  {localMapStyle === style.id && (
                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-800/50 my-2" />

          {/* Terrain Toggle */}
          <div className="p-4">
            <button
              onClick={() => handleTerrainToggle()}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                localShowTerrain
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-neutral-300 hover:bg-neutral-800/50 hover:text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-neutral-800/50">
                <Mountain className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm">3D Terrain</p>
                <p className="text-neutral-500 text-xs">Elevation exaggeration 1.5x</p>
              </div>
              <div className={`w-10 h-5 rounded-full flex items-center transition-all duration-200 ${
                localShowTerrain ? 'bg-primary-500 translate-x-5' : 'bg-neutral-700 translate-x-0'
              }`}>
                <div className="w-4 h-4 rounded-full bg-white ml-0.5 shadow-md" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeatherLayerSelector;