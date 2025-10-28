// lib/places.ts
import { Restaurant } from '@/types';
import { calculateDistance } from './location';

const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

/**
 * Wyszukuje miejsca (restaurant/cafe/bar) przez Places API (New).
 * Zwraca listę ujednoliconą do typu Restaurant, posortowaną po odległości.
 */
export const getNearbyRestaurants = async (
  latitude: number,
  longitude: number,
  radius: number = 10000 // 10 km domyślnie
): Promise<Restaurant[]> => {
  console.log(
    'Fetching restaurants with API key:',
    GOOGLE_PLACES_API_KEY ? 'configured' : 'missing'
  );

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not configured - using mocks');
    return getMockRestaurants(latitude, longitude);
  }

  try {
    const types = ['restaurant', 'cafe', 'bar'] as const;
    const allPlaces: any[] = [];

    for (const type of types) {
      console.log(`Fetching ${type}s...`);

      const resp = await fetch(
        'https://places.googleapis.com/v1/places:searchNearby',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            // FieldMask jest WYMAGANY w Places API (New)
            'X-Goog-FieldMask': [
              'places.id',
              'places.displayName',
              'places.formattedAddress',
              'places.location',
              'places.rating',
              'places.userRatingCount',
              'places.priceLevel',
              'places.types',
              'places.photos',
              'places.regularOpeningHours',
            ].join(','),
          },
          body: JSON.stringify({
            includedTypes: [type],
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: { latitude, longitude },
                radius,
              },
            },
          }),
        }
      );

      const data = await resp.json();
      console.log(`${type} response:`, data?.error ? data.error : 'OK');

      if (data?.places && Array.isArray(data.places)) {
        allPlaces.push(...data.places);
      } else if (data?.error) {
        console.warn(`API error for ${type}:`, data.error.message);
      } else {
        console.log(`No ${type}s found`);
      }
    }

    if (allPlaces.length === 0) {
      console.log('No places found - using mocks');
      return getMockRestaurants(latitude, longitude);
    }

    // deduplikacja po id
    const uniquePlaces = allPlaces.filter(
      (place, index, self) => index === self.findIndex((p) => p.id === place.id)
    );

    // mapowanie na Twój typ + dystans
    const mapped: Restaurant[] = uniquePlaces.map((place: any) => {
      const lat = place.location?.latitude;
      const lon = place.location?.longitude;

      const distance =
        typeof lat === 'number' && typeof lon === 'number'
          ? calculateDistance(latitude, longitude, lat, lon)
          : 0;

      return {
        place_id: place.id,
        name: place.displayName?.text || 'Brak nazwy',
        address: place.formattedAddress || 'Brak adresu',
        rating: place.rating ?? null,
        price_level: place.priceLevel ?? null,
        cuisine_type: detectPlaceType(place),
        lat,
        lon,
        // w nowym API referencja zdjęcia to "name" (np. "places/XXX/photos/YYY")
        photo_reference: place.photos?.[0]?.name || null,
        distance: Number(distance.toFixed(2)),
        user_ratings_total: place.userRatingCount ?? 0,
        opening_hours: place.regularOpeningHours ?? null,
      };
    });

    // sort po odległości i TOP 20
    return mapped.sort((a, b) => a.distance - b.distance).slice(0, 20);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return getMockRestaurants(latitude, longitude);
  }
};

// Prosty wybór typu po "types"
const detectPlaceType = (place: any): string => {
  const categories: string[] = place.types || [];
  if (categories.includes('cafe')) return 'cafe';
  if (categories.includes('bar')) return 'bar';
  if (categories.includes('restaurant')) return 'restaurant';
  return categories[0] || 'restaurant';
};

/** Link do zdjęcia w Places API (New) */
export const getRestaurantPhotoUrl = (
  photoReference: string,
  maxWidth: number = 400
): string => {
  if (!GOOGLE_PLACES_API_KEY || !photoReference) {
    return `https://via.placeholder.com/${maxWidth}x300/1e293b/94a3b8?text=No+Image`;
  }
  return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_PLACES_API_KEY}`;
};

/** Szczegóły miejsca (lekkie, tylko potrzebne pola do modala) */
export type PlaceDetails = {
  id: string;
  name: string;
  address: string;
  googleMapsUri?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  user_ratings_total?: number;
  price_level?: number | null;
  opening_hours?: any;
  photo_reference?: string | null;
};

export const getPlaceDetails = async (
  placeId: string
): Promise<PlaceDetails | null> => {
  const API_KEY = GOOGLE_PLACES_API_KEY;
  if (!API_KEY || !placeId) return null;

  try {
    const resp = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': [
            'id',
            'displayName',
            'formattedAddress',
            'googleMapsUri',
            'internationalPhoneNumber',
            'websiteUri',
            'rating',
            'userRatingCount',
            'priceLevel',
            'regularOpeningHours',
            'photos',
          ].join(','),
        },
      }
    );

    const data = await resp.json();
    if (data?.error) {
      console.warn('Place details error:', data.error);
      return null;
    }

    return {
      id: data.id,
      name: data.displayName?.text ?? 'Brak nazwy',
      address: data.formattedAddress ?? 'Brak adresu',
      googleMapsUri: data.googleMapsUri ?? null,
      phone: data.internationalPhoneNumber ?? null,
      website: data.websiteUri ?? null,
      rating: data.rating ?? null,
      user_ratings_total: data.userRatingCount ?? 0,
      price_level: data.priceLevel ?? null,
      opening_hours: data.regularOpeningHours ?? null,
      photo_reference: data.photos?.[0]?.name ?? null,
    };
  } catch (e) {
    console.error('getPlaceDetails failed', e);
    return null;
  }
};

/** Stabilny link do profilu miejsca w Mapach Google po place_id */
export const buildMapsPlaceLink = (placeId: string): string =>
  `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(
    placeId
  )}`;

// --- MOCKI: gdy brak API/BŁĄD ---
const getMockRestaurants = (lat: number, lon: number): Restaurant[] => [
  {
    place_id: 'mock_1',
    name: 'Restauracja Polska',
    address: 'ul. Przykładowa 1, Wrocław',
    rating: 4.5,
    price_level: 2,
    cuisine_type: 'restaurant',
    lat: lat + 0.001,
    lon: lon + 0.001,
    distance: 0.1,
    photo_reference: null,
    user_ratings_total: 150,
  },
  {
    place_id: 'mock_2',
    name: 'Sushi Bar Tokio',
    address: 'ul. Przykładowa 5, Wrocław',
    rating: 4.7,
    price_level: 3,
    cuisine_type: 'restaurant',
    lat: lat + 0.002,
    lon: lon - 0.001,
    distance: 0.2,
    photo_reference: null,
    user_ratings_total: 200,
  },
  {
    place_id: 'mock_3',
    name: 'Pizza Express',
    address: 'ul. Przykładowa 10, Wrocław',
    rating: 4.3,
    price_level: 2,
    cuisine_type: 'restaurant',
    lat: lat - 0.001,
    lon: lon + 0.002,
    distance: 0.3,
    photo_reference: null,
    user_ratings_total: 120,
  },
  {
    place_id: 'mock_4',
    name: 'Kawiarnia Artystyczna',
    address: 'ul. Przykładowa 15, Wrocław',
    rating: 4.6,
    price_level: 2,
    cuisine_type: 'cafe',
    lat: lat + 0.003,
    lon: lon + 0.002,
    distance: 0.4,
    photo_reference: null,
    user_ratings_total: 80,
  },
  {
    place_id: 'mock_5',
    name: 'Irish Pub',
    address: 'ul. Przykładowa 20, Wrocław',
    rating: 4.4,
    price_level: 2,
    cuisine_type: 'bar',
    lat: lat - 0.002,
    lon: lon - 0.003,
    distance: 0.5,
    photo_reference: null,
    user_ratings_total: 250,
  },
  {
    place_id: 'mock_6',
    name: 'Burger House',
    address: 'ul. Przykładowa 25, Wrocław',
    rating: 4.2,
    price_level: 2,
    cuisine_type: 'restaurant',
    lat: lat + 0.004,
    lon: lon - 0.002,
    distance: 0.6,
    photo_reference: null,
    user_ratings_total: 180,
  },
];
