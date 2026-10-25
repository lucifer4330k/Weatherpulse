import { useEffect, useState } from 'react';
import { MapContainer } from './components/Map';
import { WeatherDashboard } from './components/Dashboard';
import { SearchBar } from './components/Search';
import { WeatherLayerSelector } from './components/Map/WeatherLayerSelector';
import { MapLegend } from './components/Map/MapLegend';
import { useAppStore, useNavigationLevel, useSelectedState, useViewport } from './store/useAppStore';
import { useIndiaOverview as useIndiaOverviewQuery } from './hooks/useWeather';
import { 
  Home, 
  ChevronLeft, 
  Globe, 
  RotateCw, 
  Loader2,
  MapPin,
  Layers,
  Sun,
  Moon,
  Search,
  Menu,
  X,
  Settings,
  Info,
  Maximize2,
  Minimize2,
  Zap,
  Droplets,
  Wind,
  Cloud,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

function App() {
  const navigationLevel = useNavigationLevel();
  const selectedState = useSelectedState();
  const viewport = useViewport();
  const { setNavigationLevel, setSelectedState, flyToIndia, setIndiaOverview, toggleDashboard } = useAppStore();
  const { data: indiaOverview, isLoading: overviewLoading } = useIndiaOverviewQuery();
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  // Sync overview data to store for map layers & markers
  useEffect(() => {
    if (indiaOverview) {
      setIndiaOverview(indiaOverview);
    }
  }, [indiaOverview, setIndiaOverview]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (navigationLevel !== 'india') {
          flyToIndia();
        } else {
          toggleDashboard(false);
        }
      }
      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('refresh-weather'));
      }
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigationLevel, flyToIndia, toggleDashboard]);

  return (
    <div className="h-full w-full flex overflow-hidden bg-neutral-950">
      {/* Main Map Area */}
      <div className="flex-1 relative min-w-0">
        <MapContainer />
        
        {/* Top Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="glass-panel px-4 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-neutral-950/50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg tracking-tight">WeatherPulse India</h1>
                <p className="text-neutral-500 text-xs leading-tight">Real-time 3D Weather Intelligence</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Navigation Level Indicator */}
            <div className="hidden md:flex glass-panel px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg shadow-neutral-950/30">
              <span className="text-neutral-500 text-sm font-medium uppercase tracking-wider">View Level</span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                navigationLevel === 'india' ? 'bg-primary-500/20 text-primary-300 border-primary-500/30' :
                navigationLevel === 'state' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                navigationLevel === 'district' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                'bg-purple-500/20 text-purple-300 border-purple-500/30'
              }`}>
                {navigationLevel.charAt(0).toUpperCase() + navigationLevel.slice(1)}
              </span>
            </div>

            {/* Weather Layer Selector */}
            <WeatherLayerSelector />

            {/* Quick Navigation Buttons */}
            <div className="glass-panel rounded-xl p-1 flex items-center gap-1 border border-neutral-800/50 shadow-lg shadow-neutral-950/30">
              <button
                onClick={flyToIndia}
                className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
                  navigationLevel === 'india'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-neutral-500 hover:text-white hover:bg-neutral-800/50'
                }`}
                title="India Overview (Esc)"
                aria-label="India Overview"
              >
                <Home className="w-5 h-5" />
              </button>
              {navigationLevel !== 'india' && (
                <button
                  onClick={() => { setNavigationLevel('india'); setSelectedState(null); }}
                  className="p-2.5 rounded-xl text-neutral-500 hover:text-white hover:bg-neutral-800/50 transition-all"
                  title="Back to India"
                  aria-label="Back to India"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Streamlit Analytics Dashboard Link */}
            <a
              href="http://localhost:8501"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 pointer-events-auto"
              title="Open Streamlit Analytics Dashboard (Port 8501)"
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline font-semibold">Streamlit Analytics</span>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400/70" />
            </a>
          </div>
        </div>

        {/* Search Bar - Top Right */}
        <div className="absolute top-4 right-4 z-20 w-72 md:w-80 pointer-events-auto animate-slide-down">
          <SearchBar />
        </div>

        {/* Bottom Status Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
          <div className="glass-panel px-5 py-3 rounded-2xl max-w-5xl mx-auto pointer-events-auto border border-neutral-800/50 shadow-xl shadow-neutral-950/30">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-2 text-neutral-400">
                  <MapPin className="w-4 h-4" />
                  <span>Click anywhere for detailed weather</span>
                </span>
                {navigationLevel === 'state' && selectedState && (
                  <span className="flex items-center gap-2 text-blue-400">
                    <Layers className="w-4 h-4" />
                    <span className="font-medium">State: {selectedState}</span>
                  </span>
                )}
                {navigationLevel === 'city' && (
                  <span className="flex items-center gap-2 text-green-400">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">City View</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* Coordinates Display */}
                <div className="hidden lg:flex items-center gap-3 text-neutral-400 font-mono text-xs bg-neutral-900/50 px-3 py-1.5 rounded-xl border border-neutral-800/50">
                  <span className="flex items-center gap-1">
                    <span className="text-neutral-600">Lat:</span>
                    <span className="text-white tabular-nums">{viewport.center.lat.toFixed(4)}°</span>
                  </span>
                  <span className="text-neutral-600">|</span>
                  <span className="flex items-center gap-1">
                    <span className="text-neutral-600">Lon:</span>
                    <span className="text-white tabular-nums">{viewport.center.lon.toFixed(4)}°</span>
                  </span>
                  <span className="text-neutral-600">|</span>
                  <span className="flex items-center gap-1">
                    <span className="text-neutral-600">Zoom:</span>
                    <span className="text-white tabular-nums">{viewport.zoom.toFixed(1)}</span>
                  </span>
                </div>
                {overviewLoading && (
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading overview...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Map Legend - Bottom Left */}
        <MapLegend />

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-4 right-4 z-20 pointer-events-auto hidden lg:block animate-fade-in delay-500">
          <div className="glass-panel px-4 py-3 rounded-2xl border border-neutral-800/50 shadow-xl shadow-neutral-950/30 text-xs text-neutral-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-neutral-800/80 rounded-lg text-neutral-300 border border-neutral-700 font-mono text-[10px]">M</kbd>
                <span>Map Style</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-neutral-800/80 rounded-lg text-neutral-300 border border-neutral-700 font-mono text-[10px]">Esc</kbd>
                <span>Reset View</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-neutral-800/80 rounded-lg text-neutral-300 border border-neutral-700 font-mono text-[10px]">⌘S</kbd>
                <span>Search</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-neutral-800/80 rounded-lg text-neutral-300 border border-neutral-700 font-mono text-[10px]">⌘R</kbd>
                <span>Refresh</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Dashboard - Right Sidebar */}
      <WeatherDashboard />
    </div>
  );
}

export default App;