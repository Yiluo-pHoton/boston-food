import { NextRequest, NextResponse } from "next/server";

/**
 * A naive in-memory cache keyed by the request query parameters. Each entry
 * stores a timestamp (`t`) alongside the data (`data`). Entries expire
 * automatically after the TTL has passed. Note: this cache is scoped to
 * the lifetime of the serverless function instance; in a serverless
 * environment like Vercel, instances may be short‑lived and therefore
 * caching benefits are limited. For production consider using an edge
 * caching solution or KV store.
 */
const CACHE: Map<string, { t: number; data: any }> = new Map();
// Time‑to‑live in milliseconds (12 hours)
const TTL = 1000 * 60 * 60 * 12;

// Define a mapping of price levels (0–4) to human‑readable representations. If a
// place returns a priceLevel outside of the known range it is coerced to 0.
const PRICE_LEVELS = [0, 1, 2, 3, 4] as const;

interface PlaceResponse {
  places: Array<{
    id: string;
    placeId: string;
    displayName: { text: string };
    rating?: number;
    userRatingCount?: number;
    priceLevel?: number;
    types?: string[];
    currentOpeningHours?: { openNow?: boolean };
    businessStatus?: string;
  }>;
}

interface Place {
  id: string;
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  price_level: number;
  types: string[];
  open_now?: boolean;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "restaurants in Boston, MA";
  const openNow = searchParams.get("openNow") === "true";
  const minPrice = Number(searchParams.get("minPrice") ?? "0");
  const maxPrice = Number(searchParams.get("maxPrice") ?? "4");
  const type = searchParams.get("type") ?? "";

  const cacheKey = JSON.stringify({ q, openNow, minPrice, maxPrice, type });
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.t < TTL) {
    return NextResponse.json({ places: cached.data });
  }

  const body: any = {
    textQuery: q,
    maxResultCount: 50,
    includedType: type || "restaurant",
    languageCode: "en",
    regionCode: "US",
  };

  // Build the API request. We prefer POST with the new Places API. See
  // https://developers.google.com/maps/documentation/places/web-service/search-text
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask": [
        "places.id",
        "places.placeId",
        "places.displayName",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.types",
        "places.currentOpeningHours.openNow",
        "places.businessStatus",
      ].join(","),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Error calling Places API", text);
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const json = (await res.json()) as PlaceResponse;

  const mapped: Place[] = (json.places ?? [])
    .filter((p) => p.businessStatus === "OPERATIONAL")
    .map((p) => ({
      id: p.id,
      place_id: p.placeId,
      name: p.displayName?.text ?? "Unknown",
      rating: p.rating ?? 0,
      user_ratings_total: p.userRatingCount ?? 0,
      price_level: PRICE_LEVELS.includes(p.priceLevel as any) ? (p.priceLevel as number) : 0,
      types: p.types ?? [],
      open_now: p.currentOpeningHours?.openNow,
    }))
    .filter((p) => p.price_level >= minPrice && p.price_level <= maxPrice)
    .filter((p) => {
      if (openNow) {
        // Only include places explicitly marked as open now. Undefined is treated as unknown.
        return p.open_now !== false;
      }
      return true;
    });

  CACHE.set(cacheKey, { t: Date.now(), data: mapped });

  return NextResponse.json({ places: mapped });
}