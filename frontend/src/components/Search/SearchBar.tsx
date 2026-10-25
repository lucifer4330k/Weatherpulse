import { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin, Loader2 } from 'lucide-react';
import { useSearchLocations } from '../../hooks/useGeocode';
import { useAppStore, useSearchQuery, useSearchResults, useIsSearchOpen } from '../../store/useAppStore';
import type { GeocodeResult } from '../../types';

export function SearchBar() {
  const query = useSearchQuery();
  const results = useSearchResults();
  const isOpen = useIsSearchOpen();
  const { search, clear } = useSearchLocations(query);
  const [inputValue, setInputValue] = useState(query);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const storeSearch = useAppStore((state) => state.setSearchQuery);

  // Sync input with store
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  // Update selected index based on results
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    storeSearch(value);
    search(value);
    setShowResults(true);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        inputRef.current?.blur();
        break;
    }
  };

  const selectResult = (result: GeocodeResult) => {
    const coords = { lat: result.latitude, lon: result.longitude };
    const name = `${result.name}${result.admin1 ? `, ${result.admin1}` : ''}`;
    
    useAppStore.getState().setSelectedLocation(coords, name);
    useAppStore.getState().setNavigationLevel('city');
    
    clear();
    setShowResults(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (inputValue.length >= 2 && results.length > 0) {
      setShowResults(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setShowResults(false), 200);
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <label htmlFor="search" className="sr-only">Search for a city or location in India</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" aria-hidden="true" />
          <input
            ref={inputRef}
            id="search"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Search city, town, or location..."
            className="input pl-10 pr-12 py-3 text-base"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-expanded={showResults && results.length > 0}
          />
          {inputValue && (
            <button
              onClick={() => {
                clear();
                setInputValue('');
                storeSearch('');
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800/50 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div
          ref={resultsRef}
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl border border-neutral-800/50 shadow-2xl shadow-neutral-950/50 overflow-hidden z-50 animate-fade-in"
        >
          {results.length === 0 && !isOpen ? (
            <div className="p-4 text-center text-neutral-500">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 && isOpen ? (
            <div className="p-4 text-center text-neutral-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Searching...
            </div>
          ) : (
            <ul role="listbox" className="max-h-80 overflow-y-auto scrollbar-thin">
              {results.slice(0, 10).map((result, index) => (
                <li
                  key={`${result.latitude}-${result.longitude}-${result.name}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => selectResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-4 py-3 hover:bg-neutral-800/50 transition-colors cursor-pointer ${
                    index === selectedIndex ? 'bg-primary-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{result.name}</p>
                      <p className="text-neutral-400 text-sm truncate">
                        {result.admin2 ? `${result.admin2}, ` : ''}
                        {result.admin1}, {result.country}
                        {result.population && result.population > 0 && (
                          <>
                            {' • '}
                            {formatPopulation(result.population)}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-500 text-xs font-mono tabular-nums">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{result.latitude.toFixed(2)}, {result.longitude.toFixed(2)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Recent searches / suggestions when empty */}
          {results.length === 0 && inputValue.length === 0 && (
            <div className="p-3 border-t border-neutral-800/30">
              <p className="text-neutral-500 text-xs mb-2 uppercase tracking-wider">Popular locations</p>
              <div className="flex flex-wrap gap-2">
                {['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'].map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      search(city);
                      setInputValue(city);
                      storeSearch(city);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatPopulation(pop: number): string {
  if (pop >= 10000000) return `${(pop / 10000000).toFixed(1)}Cr`;
  if (pop >= 100000) return `${(pop / 100000).toFixed(1)}L`;
  if (pop >= 1000) return `${(pop / 1000).toFixed(1)}K`;
  return pop.toString();
}

export default SearchBar;