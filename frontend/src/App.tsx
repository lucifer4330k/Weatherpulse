import { useEffect, useState, useCallback } from 'react';
import { MapContainer, MapControls, MapLegend } from './components/Map';
import { TopNavbar, WeatherSummaryStrip } from './components/Navigation';
import { InsightsPanel } from './components/Dashboard';
import { 
  useAppStore, 
  useNavigationLevel, 
  useSelectedState, 
  useViewport,
  useSelectedLocation,
} from './store/useAppStore';
import { useIndiaOverview as useIndiaOverviewQuery } from './hooks/useWeather';
import type { MapStyleId, WeatherLayerType } from './services/mapUtils';

export function App() {
  const navigationLevel = useNavigationLevel();
  const selectedState = useSelectedState();
  const selectedLocation = useSelectedLocation();
  const viewport = useViewport();
  const { setViewport, setSelectedLocation, flyToIndia, setIndiaOverview } = useAppStore();
  
  // Real data query for India overview
  const { data: indiaOverview } = useIndiaOverviewQuery();

  // Primary UI states
  const [mapStyle, setMapStyle] = useState<MapStyleId>('hybrid');
  const [weatherLayer, setWeatherLayer] = useState<WeatherLayerType>('temperature');
  const [is3D, setIs3D] = useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Sync overview data to store for map layers & markers
  useEffect(() => {
    if (indiaOverview) {
      setIndiaOverview(indiaOverview);
    }
  }, [indiaOverview, setIndiaOverview]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setViewport({ zoom: Math.min(viewport.zoom + 1, 14) });
  }, [viewport.zoom, setViewport]);

  const handleZoomOut = useCallback(() => {
    setViewport({ zoom: Math.max(viewport.zoom - 1, 3) });
  }, [viewport.zoom, setViewport]);

  const handleResetView = useCallback(() => {
    flyToIndia();
  }, [flyToIndia]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (selectedLocation) {
          setSelectedLocation(null);
        } else if (navigationLevel !== 'india') {
          flyToIndia();
        }
      }
      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('refresh-weather'));
      }
      if (e.key === 'm' || e.key === 'M') {
        setMapStyle((prev) => (prev === 'hybrid' ? 'satellite' : prev === 'satellite' ? 'dark' : 'hybrid'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigationLevel, selectedLocation, flyToIndia, setSelectedLocation]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#090909] text-[#F5F5F5] select-none font-sans">
      {/* 1. Dedicated Top Navigation Bar */}
      <TopNavbar
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
        is3D={is3D}
        onToggle3D={() => setIs3D((prev) => !prev)}
      />

      {/* 2. Weather Summary KPI Strip */}
      <WeatherSummaryStrip />

      {/* 3. Main Geospatial Workspace (Split Layout) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Primary Interactive Map Stage */}
        <main 
          className="flex-1 relative overflow-hidden bg-[#090909] flex flex-col min-w-0" 
          id="main-map-stage"
          role="region"
          aria-label="Interactive India Weather Map"
        >
          {/* MapLibre 3D Canvas Container */}
          <div className="flex-1 relative w-full h-full">
            <MapContainer
              mapStyle={mapStyle}
              weatherLayer={weatherLayer}
              is3D={is3D}
            />

            {/* Docked Map Controls (Top-Left corner) */}
            <MapControls
              activeLayer={weatherLayer}
              onLayerChange={setWeatherLayer}
              activeStyle={mapStyle}
              onStyleChange={setMapStyle}
              is3D={is3D}
              onToggle3D={() => setIs3D((prev) => !prev)}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
            />

            {/* Docked Collapsible Weather Legend (Bottom-Left corner) */}
            <MapLegend activeLayer={weatherLayer} />

            {/* Geodetic Telemetry Pill (Bottom-Right corner) */}
            <div 
              className="absolute bottom-4 right-4 z-10 pointer-events-none hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded bg-[#101010]/95 backdrop-blur-md border border-[#2A2A2A] text-[11px] text-[#A3A3A3] font-mono shadow-xl"
              aria-live="polite"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E7B75A]" />
                <span className="text-[#F5F5F5] font-semibold tracking-wider uppercase text-[10px]">
                  {navigationLevel} {selectedState ? `• ${selectedState}` : ''}
                </span>
              </div>
              <span className="text-[#2A2A2A]">|</span>
              <span className="tabular-nums">LAT {viewport.center.lat.toFixed(3)}°</span>
              <span className="tabular-nums">LON {viewport.center.lon.toFixed(3)}°</span>
              <span className="tabular-nums text-[#F5F5F5]">Z {viewport.zoom.toFixed(1)}</span>
              <span className="tabular-nums text-[#737373]">{Math.round(viewport.pitch)}° PITCH</span>
            </div>
          </div>
        </main>

        {/* Right-Side Contextual Insights Panel */}
        <InsightsPanel
          isCollapsed={isPanelCollapsed}
          onToggleCollapse={() => setIsPanelCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  );
}

export default App;