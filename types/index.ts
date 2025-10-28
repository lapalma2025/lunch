export interface User {
  id: string;
  name: string;
  bio: string;
  interests: string[];
  lat: number | null;
  lon: number | null;
  is_available: boolean;
  available_until: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  age?: number;
}

export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  proposed_by: string;
  restaurant_suggestions: Restaurant[];
  selected_restaurant: Restaurant | null;
  meeting_time: string | null;
  feedback_a: Feedback | null;
  feedback_b: Feedback | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  price_level?: number;
  cuisine_type?: string;
  distance?: number;
  lat: number;
  lon: number;
  photo_reference?: string | null;
  user_ratings_total?: number;
  opening_hours?: any;
}

export interface Feedback {
  rating: 'positive' | 'negative';
  comment?: string;
  created_at: string;
}

export interface NearbyUser extends User {
  distance: number;
  age?: number;
}
