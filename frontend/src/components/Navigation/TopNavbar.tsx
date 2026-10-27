import { useState } from 'react';
import { 
  Globe, 
  RotateCw, 
  Satellite, 
  ChevronLeft, 
  BarChart3, 
  ExternalLink,
  Compass,
  Boxes,
  MapPin,
} from 'lucide-react';
import { useQueryClient } from 'react-query';
import { SearchBar } from '../Search';
import { useAppStore, useNavigationLevel, useSelectedState, useSelectedLocationName } from '../../store/useAppStore';
import { useHealthCheck, weatherKeys } from '../../hooks/useWeather';
import type { MapStyleId } from '../../services/mapUtils';

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
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: healthData, isError: isHealthError } = useHealthCheck();

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
      case 'dark': return 'Dark Canvas';
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
    <header className="h-14 w-full bg-[#101010] border-b border-[#2A2A2A] px-2 sm:px-4 flex items-center justify-between gap-2 lg:gap-4 z-40 relative flex-shrink-0">
      {/* Left: Branding & View Scope */}
      <div className="flex items-center gap-3.5 flex-shrink-0">
        <div 
          className="flex items-center gap-2.5 cursor-pointer group" 
          onClick={flyToIndia} 
          title="Return to National Overview"
        >
          <div className="w-8 h-8 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center text-[#E7B75A] group-hover:border-[#E7B75A] transition-colors">
            <Globe className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="text-[#F5F5F5] font-bold text-sm tracking-tight leading-none">
                Weather<span className="text-[#E7B75A]">Pulse</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#171717] text-[#A3A3A3] border border-[#2A2A2A] font-mono text-[9px] uppercase tracking-wider font-semibold">
                OBSERVATION DECK
              </span>
            </div>
            <p className="text-[#737373] text-[10px] leading-tight mt-0.5 font-mono">Pan-India Meteorological Stream</p>
          </div>
        </div>

        {/* View Scope Indicator */}
        <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-[#2A2A2A]">
          <span className="text-[#737373] text-[11px] font-mono uppercase tracking-wider">Scope:</span>
          {navigationLevel === 'india' ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#171717] text-[#A3A3A3] border border-[#2A2A2A] flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-[#E7B75A]" />
              National Overview
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#171717] text-[#F5F5F5] border border-[#2A2A2A] flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-[#E7B75A]" />
                {selectedLocationName || (selectedState ? `State: ${selectedState}` : 'Selected Region')}
              </span>
              <button
                onClick={flyToIndia}
                className="p-1 rounded hover:bg-[#202020] text-[#737373] hover:text-[#F5F5F5] transition-colors"
                title="Reset to National Overview"
                aria-label="Reset to National Overview"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Search Bar with Autocomplete */}
      <div className="flex-1 max-w-md lg:max-w-lg min-w-0">
        <SearchBar />
      </div>

      {/* Right: Actions, Health, Styles, Streamlit Link */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Backend Live Health Status */}
        <div 
          className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-[#171717] border border-[#2A2A2A] text-[11px] font-mono"
          title={isHealthError ? 'FastAPI Backend Unreachable' : healthData?.status === 'healthy' ? 'FastAPI service healthy' : 'Backend degraded'}
        >
          {isHealthError ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F]" />
              <span className="text-[#D9534F]">API Offline</span>
            </>
          ) : healthData?.status !== 'healthy' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7B75A]" />
              <span className="text-[#E7B75A]">Degraded</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#3EA874]" />
              <span className="text-[#A3A3A3]">API</span>
              <span className="text-[#3EA874]">ONLINE</span>
            </>
          )}
        </div>

        {/* 2D / 3D Perspective Toggle Button */}
        <button
          onClick={onToggle3D}
          className={`hidden md:flex px-2.5 py-1 rounded text-xs font-mono font-medium border items-center gap-1.5 transition-colors ${
            is3D 
              ? 'bg-[#171717] text-[#E7B75A] border-[#E7B75A]/60' 
              : 'bg-[#171717] text-[#A3A3A3] border-[#2A2A2A] hover:text-[#F5F5F5] hover:border-neutral-600'
          }`}
          title={is3D ? 'Switch to 2D Top-Down View' : 'Switch to 3D Tilted Perspective'}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>{is3D ? '3D' : '2D'}</span>
        </button>

        {/* Map Style Switcher */}
        <button
          onClick={cycleMapStyle}
          className="hidden sm:flex px-2.5 py-1 rounded text-xs font-mono font-medium bg-[#171717] text-[#A3A3A3] border border-[#2A2A2A] hover:border-neutral-600 hover:text-[#F5F5F5] transition-colors items-center gap-1.5"
          title={`Active Style: ${getStyleLabel(currentStyle)}. Click to switch.`}
        >
          <Satellite className="w-3.5 h-3.5 text-[#E7B75A]" />
          <span className="hidden sm:inline">{getStyleLabel(currentStyle)}</span>
        </button>

        {/* Manual Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded bg-[#171717] text-[#A3A3A3] border border-[#2A2A2A] hover:border-neutral-600 hover:text-[#F5F5F5] transition-colors"
          title="Refresh Meteorological Records"
          aria-label="Refresh Meteorological Records"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#E7B75A]' : ''}`} />
        </button>

        {/* Streamlit Analytics Standalone Hub Link */}
        <a
          href="http://localhost:8501"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex px-2.5 py-1 rounded text-xs font-mono font-semibold bg-[#171717] text-[#E7B75A] border border-[#E7B75A]/40 hover:bg-[#202020] hover:border-[#E7B75A] transition-colors items-center gap-1.5"
          title="Open Streamlit Analytics Dashboard on Port 8501"
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#E7B75A]" />
          <span className="hidden md:inline">Streamlit Hub</span>
          <ExternalLink className="w-3 h-3 text-[#E7B75A]/70" />
        </a>
      </div>
    </header>
  );
}

export default TopNavbar;
