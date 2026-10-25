import { useState } from 'react';
import { 
  Globe, 
  RotateCw, 
  Layers, 
  Satellite, 
  Sun, 
  Moon, 
  Home, 
  ChevronLeft, 
  BarChart3, 
  ExternalLink,
  Activity,
  Compass,
  Boxes,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useQueryClient } from 'react-query';
import { SearchBar } from '../Search';
import { useAppStore, useNavigationLevel, useSelectedState, useSelectedLocationName } from '../../store/useAppStore';
import { useHealthCheck, weatherKeys } from '../../hooks/useWeather';
import { MapStyleId, MAP_STYLES } from '../../services/mapUtils';

interface TopNavbarProps {
  currentStyle: MapStyleId;
  onStyleChange: (style: MapStyleId) => void;
  is3D: boolean;
  onToggle3D: () => void;
}

export function TopNavbar({ currentStyle, onStyleChange, is3D, onToggle3D }: TopNavbarProps) {
  const navigationLevel = useNavigationLevel();
  const selectedState = useSelectedState();
  const selectedLocationName = useSelectedLocationName();
  const flyToIndia = useAppStore((state) => state.flyToIndia);
  const setSelectedState = useAppStore((state) => state.setSelectedState);
  const setNavigationLevel = useAppStore((state) => state.setNavigationLevel);
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: healthData, isError: isHealthError, isFetching: isHealthFetching } = useHealthCheck();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries(weatherKeys.all);
    window.dispatchEvent(new CustomEvent('refresh-weather'));
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const getStyleLabel = (style: MapStyleId) => {
    switch (style) {
      case 'hybrid': return 'Hybrid';
      case 'satellite': return 'Satellite';
      case 'dark': return 'Dark';
    }
  };

  const cycleMapStyle = () => {
    const nextStyle: Record<MapStyleId, MapStyleId> = {
      'hybrid': 'satellite',
      'satellite': 'dark',
      'dark': 'hybrid'
    };
    onStyleChange(nextStyle[currentStyle] || 'hybrid');
  };

  return (
    <header className="h-16 w-full bg-[#0B1526]/95 border-b border-[#1E2E48] px-4 flex items-center justify-between gap-4 z-40 relative backdrop-blur-md flex-shrink-0">
      {/* Left: Branding & View Scope */}
      <div className="flex items-center gap-3.5 flex-shrink-0">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={flyToIndia} title="Return to India Overview">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 relative group">
            <Globe className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0B1526] geo-radar-pulse" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-base tracking-tight leading-none">
                Weather<span className="text-cyan-400">Pulse</span>
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-mono text-[10px] uppercase tracking-wider font-semibold">
                3D India
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-tight mt-0.5 font-medium">Real-time Weather Intelligence</p>
          </div>
        </div>

        {/* View Scope Indicator with Reset Action */}
        <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-[#1E2E48]">
          <span className="text-slate-500 text-xs font-medium">Scope:</span>
          {navigationLevel === 'india' ? (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              National Overview
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {selectedLocationName || (selectedState ? `State: ${selectedState}` : 'Selected Region')}
              </span>
              <button
                onClick={flyToIndia}
                className="p-1 rounded-lg hover:bg-[#1E2E48] text-slate-400 hover:text-white transition-colors"
                title="Reset to India Overview"
                aria-label="Reset to India Overview"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Search Bar with Autocomplete Dropdown */}
      <div className="flex-1 max-w-md lg:max-w-lg min-w-0">
        <SearchBar />
      </div>

      {/* Right: Actions, Health, Styles, Streamlit Link */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Backend Live Health Status */}
        <div 
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#07111F]/80 border border-[#1E2E48] text-xs font-mono"
          title={isHealthError ? 'FastAPI Backend Unreachable' : 'FastAPI Backend Connected'}
        >
          {isHealthError ? (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-rose-400 font-sans">API Offline</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-sans">Backend</span>
              <span className="text-emerald-400">● OK</span>
            </>
          )}
        </div>

        {/* 2D / 3D Perspective Toggle Button */}
        <button
          onClick={onToggle3D}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all duration-200 ${
            is3D 
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20' 
              : 'bg-[#0D1828] text-slate-400 border-[#1E2E48] hover:text-white hover:border-slate-600'
          }`}
          title={is3D ? 'Switch to 2D Top-Down View' : 'Switch to 3D Tilted Perspective'}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>{is3D ? '3D View' : '2D Flat'}</span>
        </button>

        {/* Satellite / Dark Map Style Switcher */}
        <button
          onClick={cycleMapStyle}
          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#0D1828] text-slate-300 border border-[#1E2E48] hover:border-slate-600 hover:text-white transition-all flex items-center gap-1.5"
          title={`Active Style: ${getStyleLabel(currentStyle)}. Click to switch.`}
        >
          <Satellite className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">{getStyleLabel(currentStyle)}</span>
        </button>

        {/* Manual Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-[#0D1828] text-slate-300 border border-[#1E2E48] hover:border-slate-600 hover:text-white transition-colors"
          title="Refresh All Weather Data"
          aria-label="Refresh All Weather Data"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        {/* Streamlit Analytics Standalone Hub Link */}
        <a
          href="http://localhost:8501"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all flex items-center gap-1.5 shadow-sm"
          title="Open Streamlit Analytics Dashboard on Port 8501"
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Streamlit Hub</span>
          <ExternalLink className="w-3 h-3 text-amber-400/80" />
        </a>
      </div>
    </header>
  );
}
