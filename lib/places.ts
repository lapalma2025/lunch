import { Restaurant } from '@/types';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export const getNearbyRestaurants = async (
  latitude: number,
  longitude: number,
  radius: number = 1000
): Promise<Restaurant[]> => {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('Google Places API key not configured');
    return getMockRestaurants(latitude, longitude);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=restaurant&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.warn('Google Places API error:', data.status);
      return getMockRestaurants(latitude, longitude);
    }

    return data.results.slice(0, 10).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      price_level: place.price_level,
      cuisine_type: place.types?.[0],
      lat: place.geometry.location.lat,
      lon: place.geometry.location.lng,
      photo_reference: place.photos?.[0]?.photo_reference,
    }));
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return getMockRestaurants(latitude, longitude);
  }
};

const getMockRestaurants = (lat: number, lon: number): Restaurant[] => {
  return [
    {
      place_id: 'mock_1',
      name: 'Restauracja Polska',
      address: 'ul. Przykładowa 1',
      rating: 4.5,
      price_level: 2,
      cuisine_type: 'polish',
      lat: lat + 0.001,
      lon: lon + 0.001,
      distance: 0.1,
    },
    {
      place_id: 'mock_2',
      name: 'Sushi Bar',
      address: 'ul. Przykładowa 5',
      rating: 4.7,
      price_level: 3,
      cuisine_type: 'japanese',
      lat: lat + 0.002,
      lon: lon - 0.001,
      distance: 0.2,
    },
    {
      place_id: 'mock_3',
      name: 'Pizza Express',
      address: 'ul. Przykładowa 10',
      rating: 4.3,
      price_level: 2,
      cuisine_type: 'italian',
      lat: lat - 0.001,
      lon: lon + 0.002,
      distance: 0.3,
    },
  ];
};

export const getRestaurantPhotoUrl = (
  photoReference: string,
  maxWidth: number = 400
): string => {
  if (!GOOGLE_PLACES_API_KEY || !photoReference) {
    return '';
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
};
