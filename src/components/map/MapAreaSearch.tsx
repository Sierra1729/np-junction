"use client";

import React, { useState } from "react";
import { Search, MapPin, Loader2, X, Navigation } from "lucide-react";
import { parseCoordinateString } from "@/lib/geo/coordinates";

export interface AreaLocation {
  name: string;
  lat: number;
  lng: number;
  district?: string;
  state?: string;
}

// Prominent agricultural regions, user hometowns & Google benchmark / pilot locations
export const PRESET_AREAS: AreaLocation[] = [
  {
    name: "Kotli Arjun Singh (RS Pura, Jammu)",
    lat: 32.624964,
    lng: 74.752361,
    district: "Jammu",
    state: "Jammu & Kashmir",
  },
  {
    name: "University of Jammu",
    lat: 32.7185,
    lng: 74.8698,
    district: "Jammu",
    state: "Jammu & Kashmir",
  },
  {
    name: "Raigad / Pune Benchmark (Live API)",
    lat: 18.624,
    lng: 73.076,
    district: "Raigad/Pune",
    state: "Maharashtra",
  },
  {
    name: "Baramati Cadastre",
    lat: 18.152,
    lng: 74.578,
    district: "Pune",
    state: "Maharashtra",
  },
  {
    name: "Nashik Onion & Grape Belt",
    lat: 19.997,
    lng: 73.789,
    district: "Nashik",
    state: "Maharashtra",
  },
  {
    name: "Ludhiana Wheat Plain",
    lat: 30.901,
    lng: 75.857,
    district: "Ludhiana",
    state: "Punjab",
  },
  {
    name: "Karimnagar Pilot (ALU)",
    lat: 18.438,
    lng: 79.128,
    district: "Karimnagar",
    state: "Telangana",
  },
];

// Local instant-match alias registry for common rural hamlets and institutional landmarks
interface LocalAlias {
  patterns: string[];
  location: AreaLocation;
}

const LOCAL_ALIASES: LocalAlias[] = [
  {
    patterns: [
      "kotli arjun singh",
      "kotli",
      "kotli arjun",
      "rs pura",
      "r.s. pura",
      "r s pura",
      "ranbir singh pura",
      "kotli arjun singh, rs pura",
      "kotli arjun singh, rs pura, jammu",
    ],
    location: {
      name: "Kotli Arjun Singh, RS Pura",
      lat: 32.624964,
      lng: 74.752361,
      district: "RS Pura, Jammu",
      state: "Jammu & Kashmir",
    },
  },
  {
    patterns: [
      "jammu university",
      "jammu univsisty",
      "jammu univ",
      "university of jammu",
      "jammu campus",
      "bahu roop jammu",
    ],
    location: {
      name: "University of Jammu",
      lat: 32.7185,
      lng: 74.8698,
      district: "Jammu",
      state: "Jammu & Kashmir",
    },
  },
  {
    patterns: ["raigad", "pune benchmark", "pune live"],
    location: {
      name: "Raigad / Pune Benchmark (Live API)",
      lat: 18.624,
      lng: 73.076,
      district: "Raigad/Pune",
      state: "Maharashtra",
    },
  },
  {
    patterns: ["baramati", "baramati cadastre"],
    location: {
      name: "Baramati Cadastre",
      lat: 18.152,
      lng: 74.578,
      district: "Pune",
      state: "Maharashtra",
    },
  },
  {
    patterns: ["nashik", "nasik", "nashik grape"],
    location: {
      name: "Nashik Onion & Grape Belt",
      lat: 19.997,
      lng: 73.789,
      district: "Nashik",
      state: "Maharashtra",
    },
  },
  {
    patterns: ["ludhiana", "punjab wheat"],
    location: {
      name: "Ludhiana Wheat Plain",
      lat: 30.901,
      lng: 75.857,
      district: "Ludhiana",
      state: "Punjab",
    },
  },
];

interface MapAreaSearchProps {
  onSelectArea: (location: AreaLocation) => void;
  isLoading?: boolean;
}

export function MapAreaSearch({ onSelectArea, isLoading = false }: MapAreaSearchProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parse direct coordinate input: decimal "32.6249, 74.7523" or DMS "323729.87 n and 744508.50 e"
  const tryParseCoordinates = (text: string) => parseCoordinateString(text);

  // Normalize common typos in queries
  const normalizeQuery = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/\bunivsisty\b/g, "university")
      .replace(/\buniversty\b/g, "university")
      .replace(/\bunv\b/g, "university")
      .trim();
  };

  // Find local instant match
  const findLocalAlias = (text: string): AreaLocation | null => {
    const normalized = normalizeQuery(text);
    for (const alias of LOCAL_ALIASES) {
      if (
        alias.patterns.some((p) => normalized === p || normalized.includes(p) || p.includes(normalized))
      ) {
        return alias.location;
      }
    }
    return null;
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const trimmed = query.trim();
    if (!trimmed) return;

    // 1. Direct coordinate format
    const directCoords = tryParseCoordinates(trimmed);
    if (directCoords) {
      onSelectArea({
        name: `Lat: ${directCoords.lat.toFixed(4)}, Lng: ${directCoords.lng.toFixed(4)}`,
        lat: directCoords.lat,
        lng: directCoords.lng,
      });
      return;
    }

    // 2. Instant Local Alias match (Kotli Arjun Singh, RS Pura, Jammu University, etc.)
    const localMatch = findLocalAlias(trimmed);
    if (localMatch) {
      onSelectArea(localMatch);
      return;
    }

    // 3. Geocode with Nominatim (with progressive parent fallback)
    setSearching(true);
    try {
      const normalized = normalizeQuery(trimmed);
      
      // Step A: Search full normalized query
      let searchTerms = [normalized];
      
      // If query has commas (e.g. "kotli arjun singh, rs pura, jammu"), prepare fallback terms
      if (trimmed.includes(",")) {
        const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          // e.g. "rs pura, jammu"
          searchTerms.push(parts.slice(1).join(", "));
          // e.g. "jammu"
          searchTerms.push(parts[parts.length - 1]);
        }
      }

      let foundResult: any = null;
      let matchedTerm = "";

      for (const term of searchTerms) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            term
          )}&countrycodes=in&limit=1`;
          const res = await fetch(url, {
            headers: {
              "Accept-Language": "en",
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              foundResult = data[0];
              matchedTerm = term;
              break;
            }
          }
        } catch {}
      }

      if (foundResult) {
        const lat = parseFloat(foundResult.lat);
        const lng = parseFloat(foundResult.lon);
        const title = matchedTerm === normalized
          ? (foundResult.display_name.split(",")[0] || trimmed)
          : `${trimmed} (${foundResult.display_name.split(",")[0] || matchedTerm})`;
        
        onSelectArea({
          name: title,
          lat,
          lng,
          district: foundResult.display_name,
        });
      } else {
        setErrorMsg(`Could not find "${trimmed}". Try searching by tehsil/district (e.g. RS Pura, Jammu, Baramati) or coordinates (e.g. 32.6249, 74.7523 or 32°37'30"N 74°45'09"E).`);
      }
    } catch {
      setErrorMsg("Failed to search location. You can paste GPS coordinates directly (e.g. 32.6249, 74.7523 or 323729.87 n and 744508.50 e).");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            {searching || isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Search area (e.g. Kotli Arjun Singh, RS Pura, Jammu, or 323729.87 n and 744508.50 e)..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 shadow-2xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={searching || isLoading || !query.trim()}
          className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Find Area</span>
        </button>
      </form>

      {/* Preset Area Quick Jumps */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <span className="text-stone-400 dark:text-stone-400 font-semibold shrink-0 flex items-center gap-1 text-[11px]">
          <MapPin className="w-3 h-3 text-emerald-500" /> Quick Jumps:
        </span>
        {PRESET_AREAS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => {
              setQuery(preset.name);
              onSelectArea(preset);
            }}
            className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 text-stone-700 dark:text-stone-200 font-medium transition-colors whitespace-nowrap shrink-0 border border-stone-200 dark:border-stone-700/80 shadow-2xs"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium px-1">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
