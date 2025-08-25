"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

/**
 * A single place/business returned from the Places API. The fields included
 * here are those required to plot on the chart and filter by rating, reviews,
 * price level, open hours and types. Additional fields (like `place_id`) may
 * be included for linking back to Google Maps.
 */
export interface Place {
  id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  price_level: number;
  types: string[];
  open_now?: boolean;
  place_id?: string;
}

interface RestaurantMatrixProps {
  /**
   * Optional initial data. When provided the component will render this data
   * immediately without performing a network request. If omitted the component
   * will attempt to fetch data from the `/api/places` endpoint on mount.
   */
  initialData?: Place[];
}

/**
 * Interactive scatter matrix plotting restaurant (or other place) ratings
 * against total review counts. The matrix includes simple controls for
 * searching by name, filtering by open-now status and price range, and
 * selecting a primary type (such as `italian` or `sushi`) to narrow
 * results. Data is fetched from the backend on demand.
 */
export default function RestaurantMatrix({ initialData }: RestaurantMatrixProps) {
  const [data, setData] = useState<Place[]>(initialData ?? []);
  const [search, setSearch] = useState<string>("");
  const [openNowOnly, setOpenNowOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 4]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Compute a list of unique types for the select control.
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    data.forEach((p) => {
      p.types.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [data]);

  // Whenever filters change recompute the filtered dataset. The filtering is
  // implemented on the client to reduce the number of API calls and to
  // provide immediate feedback when tweaking controls.
  const filtered = useMemo(() => {
    return data.filter((p) => {
      // Search by name (case insensitive substring match)
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Open now filter: if openNowOnly is true require open_now to be
      // explicitly true. Some places may not include `open_now`, so we treat
      // undefined as unknown and include them when the filter is not set.
      if (openNowOnly && p.open_now === false) {
        return false;
      }
      // Price range (inclusive)
      if (p.price_level < priceRange[0] || p.price_level > priceRange[1]) {
        return false;
      }
      // Type filter: allow selecting a single type to narrow results. When
      // selectedType is empty we include all types.
      if (selectedType && !p.types.includes(selectedType)) {
        return false;
      }
      return true;
    });
  }, [data, search, openNowOnly, priceRange, selectedType]);

  // On first render, if no initial data was provided, fetch from the
  // serverless API route. We perform a simple fetch without any query
  // parameters; you can pass parameters via the URL if desired.
  useEffect(() => {
    if (initialData) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/places");
        const json = await res.json();
        setData(json.places ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // The dependency array intentionally omits data to avoid re-fetching on
    // subsequent renders.
  }, [initialData]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col">
          <label htmlFor="search" className="text-sm font-medium text-gray-700 mb-1">
            Search by name
          </label>
          <input
            id="search"
            type="text"
            className="rounded border p-2"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="priceRange" className="text-sm font-medium text-gray-700 mb-1">
            Price range ($ – $$$$)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={4}
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
              className="w-16 border rounded p-1"
            />
            <span>–</span>
            <input
              type="number"
              min={0}
              max={4}
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              className="w-16 border rounded p-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="openNow"
            type="checkbox"
            checked={openNowOnly}
            onChange={(e) => setOpenNowOnly(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="openNow" className="text-sm font-medium text-gray-700">
            Open now
          </label>
        </div>
        <div className="flex flex-col">
          <label htmlFor="type" className="text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type"
            className="border rounded p-2"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative w-full h-[600px] bg-white shadow rounded p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              {/* Vertical reference line at average rating 4.35 */}
              <ReferenceLine x={4.35} stroke="#ddd" strokeDasharray="3 3" />
              {/* Horizontal reference line at 1000 reviews */}
              <ReferenceLine y={1000} stroke="#ddd" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="rating"
                name="Average rating"
                domain={[3.5, 5]}
                tickCount={4}
                label={{ value: "Average rating (1–5)", position: "insideBottom", dy: 10 }}
              />
              <YAxis
                type="number"
                dataKey="user_ratings_total"
                name="Number of reviews"
                scale="log"
                domain={[10, "auto"]}
                tickCount={4}
                label={{ value: "Total number of reviews", angle: -90, position: "insideLeft", dx: -10 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const p = payload[0].payload as Place;
                    return (
                      <div className="rounded border bg-white p-2 text-xs shadow">
                        <div className="font-semibold">{p.name}</div>
                        <div>Rating: {p.rating.toFixed(1)}</div>
                        <div>Reviews: {p.user_ratings_total}</div>
                        {p.price_level !== undefined && (
                          <div>Price: {"$".repeat(p.price_level + 1)}</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Places" data={filtered} fill="#4f46e5" />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}