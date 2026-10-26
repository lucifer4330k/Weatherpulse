import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, MapPin, Loader2, Compass, Building2 } from 'lucide-react';
import { useSearchLocations } from '../../hooks/useGeocode';
import { useAppStore } from '../../store/useAppStore';
import { INDIA_CITIES } from '../../data/india-cities';
import type { GeocodeResult } from '../../types';

interface SearchOption {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  tier?: number;
  population?: number;
  isCapital?: boolean;
  source: 'city-database' | 'geocoder';
}

export function SearchBar() {
  const [inputValue, setInputValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { search: triggerRemoteSearch, clear: clearRemote, results: remoteResults, isLoading: isRemoteLoading } = useSearchLocations('');

  // Local instant search across INDIA_CITIES
  const localResults = useMemo<SearchOption[]>(() => {
    if (!inputValue || inputValue.trim().length < 2) return [];
    const query = inputValue.toLowerCase().trim();

    return INDIA_CITIES
      .filter((city) => 
        city.name.toLowerCase().includes(query) || 
        city.state.toLowerCase().includes(query) ||
        city.stateCode.toLowerCase() === query
      )
      .slice(0, 8)
      .map((city) => ({
        id: `local-${city.name}-${city.stateCode}`,
        name: city.name,
        state: city.state,
        lat: city.lat,
        lon: city.lon,
        tier: city.tier,
        population: city.population,
        isCapital: city.isCapital,
        source: 'city-database',
      }));
  }, [inputValue]);

  // Combined options: local instant matches + remote geocoding results
  const allResults = useMemo<SearchOption[]>(() => {
    const combined: SearchOption[] = [...localResults];
    const seenNames = new Set(localResults.map(r => r.name.toLowerCase()));

    if (remoteResults && remoteResults.length > 0) {
      remoteResults.forEach((geo: GeocodeResult) => {
        if (!seenNames.has(geo.name.toLowerCase())) {
          seenNames.add(geo.name.toLowerCase());
          combined.push({
            id: `geo-${geo.name}-${geo.latitude}`,
            name: geo.name,
            state: geo.admin1 || geo.country || 'India',
            lat: geo.latitude,
            lon: geo.longitude,
            population: geo.population,
            source: 'geocoder',
          });
        }
      });
    }

    return combined.slice(0, 10);
  }, [localResults, remoteResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setShowResults(true);
    setSelectedIndex(-1);
    if (val.trim().length >= 2) {
      triggerRemoteSearch(val.trim());
    } else {
      clearRemote();
    }
  };

  const handleSelect = (option: SearchOption) => {
    const coords = { lat: option.lat, lon: option.lon };
    const label = `${option.name}, ${option.state}`;

    useAppStore.getState().setSelectedLocation(coords, label);
    useAppStore.getState().setNavigationLevel('city');
    useAppStore.getState().setViewport({
      center: coords,
      zoom: 9.5,
      pitch: 42,
    });

    setInputValue(option.name);
    setShowResults(false);
    clearRemote();
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults) {
      if (e.key === 'ArrowDown') {
        setShowResults(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex]);
      } else if (allResults.length > 0) {
        handleSelect(allResults[0]);
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
      inputRef.current?.blur();
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearInput = () => {
    setInputValue('');
    clearRemote();
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-[#737373] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowResults(true)}
          placeholder="Search Indian city, capital, or station..."
          className="w-full h-9 pl-9 pr-9 rounded bg-[#101010] border border-[#2A2A2A] text-[#F5F5F5] placeholder-[#737373] text-xs focus:outline-none focus:border-[#E7B75A]/60 focus:ring-1 focus:ring-[#E7B75A]/40 transition-colors font-sans"
          autoComplete="off"
          spellCheck="false"
        />
        {inputValue && (
          <button
            onClick={clearInput}
            className="absolute right-2.5 p-1 rounded text-[#737373] hover:text-[#F5F5F5] hover:bg-[#171717] transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown - Anchored directly beneath search */}
      {showResults && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1.5 rounded bg-[#101010] border border-[#2A2A2A] shadow-2xl shadow-black/90 overflow-hidden z-50 animate-fade-in"
          style={{ maxHeight: '380px' }}
        >
          {inputValue.trim().length < 2 ? (
            /* Quick Picks when input is empty or 1 letter */
            <div className="p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#737373] mb-2 flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-[#E7B75A]" />
                Major Meteorological Stations
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Mumbai', 'Delhi', 'Bengaluru', 'Kolkata', 'Chennai', 'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Shimla'].map((city) => (
                  <button
                    key={city}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setInputValue(city);
                      triggerRemoteSearch(city);
                      const matched = INDIA_CITIES.find(c => c.name.toLowerCase() === city.toLowerCase());
                      if (matched) {
                        handleSelect({
                          id: `local-${matched.name}`,
                          name: matched.name,
                          state: matched.state,
                          lat: matched.lat,
                          lon: matched.lon,
                          source: 'city-database',
                        });
                      }
                    }}
                    className="px-2 py-1 rounded bg-[#171717] hover:bg-[#202020] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#2A2A2A] hover:border-[#E7B75A]/40 text-xs transition-colors font-mono"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          ) : allResults.length > 0 ? (
            /* Match List */
            <ul className="divide-y divide-[#2A2A2A]/50 overflow-y-auto max-h-[320px] scrollbar-thin">
              {allResults.map((option, idx) => (
                <li
                  key={option.id}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                    idx === selectedIndex 
                      ? 'bg-[#1E1E1E] text-white border-l-2 border-l-[#E7B75A]' 
                      : 'text-[#A3A3A3] hover:bg-[#171717]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                      option.isCapital 
                        ? 'bg-[#E7B75A]/15 text-[#E7B75A] border border-[#E7B75A]/30' 
                        : 'bg-[#171717] text-[#A3A3A3] border border-[#2A2A2A]'
                    }`}>
                      {option.isCapital ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-[#F5F5F5] truncate">{option.name}</span>
                        {option.isCapital && (
                          <span className="px-1.5 py-0.2 rounded bg-[#E7B75A]/15 text-[#E7B75A] text-[9px] font-mono font-medium border border-[#E7B75A]/30">
                            Capital
                          </span>
                        )}
                        {option.tier === 1 && !option.isCapital && (
                          <span className="px-1.5 py-0.2 rounded bg-[#202020] text-[#A3A3A3] text-[9px] font-mono border border-[#333333]">
                            Metro
                          </span>
                        )}
                      </div>
                      <p className="text-[#737373] text-[11px] truncate">{option.state}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <span className="font-mono text-[10px] text-[#737373] tabular-nums">
                      {option.lat.toFixed(2)}°, {option.lon.toFixed(2)}°
                    </span>
                    {option.population && option.population > 0 && (
                      <p className="text-[10px] text-[#737373] font-mono">
                        {(option.population / 1000000).toFixed(1)}M
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : isRemoteLoading ? (
            /* Loading State */
            <div className="p-4 flex items-center justify-center gap-2 text-[#737373] text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-[#E7B75A]" />
              Searching meteorological stations...
            </div>
          ) : (
            /* No Results */
            <div className="p-4 text-center text-[#737373] text-xs">
              No Indian locations found matching <span className="text-[#F5F5F5] font-medium">"{inputValue}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;