import { useState, useRef, useEffect } from 'react';
import { 
  Layers, 
  X, 
  ChevronDown,
  Mountain,
} from 'lucide-react';
import { WEATHER_LAYERS, getWeatherLayerConfig } from '../../services/mapUtils';

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

  const MAP_STYLE_OPTIONS = [
    { id: 'dark', label: 'Dark Canvas', description: 'Deep contrast for weather data', icon: '🌙' },
    { id: 'satellite', label: 'Satellite', description: 'Real orbital satellite imagery', icon: '🌍' },
    { id: 'hybrid', label: 'Hybrid', description: 'Satellite with borders and labels', icon: '🛰️' },
  ] as const;

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Main button */}
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-[#101010] border border-[#2A2A2A] p-2 rounded flex items-center gap-2 shadow-lg shadow-black/60 transition-colors hover:border-[#E7B75A]/60 group"
        aria-expanded={isExpanded}
        aria-haspopup="listbox"
        aria-label="Map layers and style"
        title="Map Layers & Style"
      >
        <div className="w-8 h-8 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center text-[#E7B75A]">
          <Layers className="w-4 h-4" />
        </div>
        {isExpanded && (
          <div className="flex items-center gap-2 text-[#A3A3A3] text-xs font-mono hidden sm:block">
            <span className="capitalize">{getWeatherLayerConfig(localWeatherLayer)?.label || 'None'}</span>
            <ChevronDown className="w-3.5 h-3.5 inline ml-1" />
          </div>
        )}
      </button>

      {/* Dropdown panel */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-[#101010] border border-[#2A2A2A] rounded shadow-2xl shadow-black/80 overflow-hidden z-50">
          {/* Header */}
          <div className="p-3 border-b border-[#2A2A2A]">
            <div className="flex items-center justify-between">
              <h3 className="text-[#F5F5F5] font-semibold text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#E7B75A]" />
                Map Layers & Overlays
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weather Layer Section */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[#737373] text-[10px] font-mono font-semibold uppercase tracking-wider">Active Overlay</h4>
              <span className="text-[#A3A3A3] text-[10px] font-mono">{getWeatherLayerConfig(localWeatherLayer)?.label || 'None'}</span>
            </div>
            
            <div className="space-y-1" role="listbox" aria-label="Weather overlay">
              {[...WEATHER_LAYERS, { id: 'none' as const, label: 'None', icon: '✕', description: 'No weather overlay', colorScale: [], unit: '', dataField: '', tooltipFormatter: () => '' }].map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => { handleLayerChange(layer.id); setIsExpanded(false); }}
                  role="option"
                  aria-selected={localWeatherLayer === layer.id}
                  className={`w-full flex items-center gap-2.5 p-2 rounded transition-colors ${
                    localWeatherLayer === layer.id
                      ? 'bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/40'
                      : 'text-[#A3A3A3] hover:bg-[#171717] hover:text-[#F5F5F5] border border-transparent'
                  }`}
                >
                  <div className="w-7 h-7 rounded flex items-center justify-center text-sm bg-[#171717] border border-[#2A2A2A]">
                    {layer.icon}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-xs truncate">{layer.label}</p>
                    <p className="text-[#737373] text-[10px] truncate">{layer.description}</p>
                  </div>
                  {localWeatherLayer === layer.id && (
                    <div className="w-4 h-4 rounded-full bg-[#E7B75A] flex items-center justify-center text-[#090909]">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#2A2A2A] my-1" />

          {/* Map Style Section */}
          <div className="p-3 space-y-2">
            <h4 className="text-[#737373] text-[10px] font-mono font-semibold uppercase tracking-wider">Canvas Style</h4>
            
            <div className="space-y-1" role="radiogroup" aria-label="Map style">
              {MAP_STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => { handleStyleChange(style.id); setIsExpanded(false); }}
                  role="radio"
                  aria-checked={localMapStyle === style.id}
                  className={`w-full flex items-center gap-2.5 p-2 rounded transition-colors ${
                    localMapStyle === style.id
                      ? 'bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/40'
                      : 'text-[#A3A3A3] hover:bg-[#171717] hover:text-[#F5F5F5] border border-transparent'
                  }`}
                >
                  <div className="w-7 h-7 rounded flex items-center justify-center text-sm bg-[#171717] border border-[#2A2A2A]">
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-xs truncate">{style.label}</p>
                    <p className="text-[#737373] text-[10px] truncate">{style.description}</p>
                  </div>
                  {localMapStyle === style.id && (
                    <div className="w-4 h-4 rounded-full bg-[#E7B75A] flex items-center justify-center text-[#090909]">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#2A2A2A] my-1" />

          {/* Terrain Toggle */}
          <div className="p-3">
            <button
              onClick={() => handleTerrainToggle()}
              className={`w-full flex items-center gap-2.5 p-2 rounded transition-colors ${
                localShowTerrain
                  ? 'bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/40'
                  : 'text-[#A3A3A3] hover:bg-[#171717] hover:text-[#F5F5F5] border border-transparent'
              }`}
            >
              <div className="w-7 h-7 rounded flex items-center justify-center text-sm bg-[#171717] border border-[#2A2A2A]">
                <Mountain className="w-4 h-4 text-[#E7B75A]" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-xs">3D Elevation Relief</p>
                <p className="text-[#737373] text-[10px]">Terrarium elevation model</p>
              </div>
              <div className={`w-8 h-4 rounded-full flex items-center transition-colors p-0.5 ${
                localShowTerrain ? 'bg-[#E7B75A]' : 'bg-[#2A2A2A]'
              }`}>
                <div className={`w-3 h-3 rounded-full bg-[#090909] shadow-sm transform transition-transform ${
                  localShowTerrain ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeatherLayerSelector;