/*
  # Lunchly Application Database Schema

  ## Overview
  Creates the complete database schema for the Lunchly lunch meetup application.

  ## New Tables

  ### `users`
  Extended user profile information linked to Supabase Auth
  - `id` (uuid, primary key) - References auth.users
  - `name` (text) - User's display name
  - `bio` (text) - User biography/description
  - `interests` (text[]) - Array of user interests (e.g., "startup", "UX", "AI")
  - `lat` (double precision) - Current latitude position
  - `lon` (double precision) - Current longitude position
  - `is_available` (boolean) - Whether user is available for lunch
  - `available_until` (timestamptz) - Timestamp when availability expires
  - `avatar_url` (text) - URL to user's profile picture
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### `matches`
  Stores lunch match proposals between users
  - `id` (uuid, primary key) - Unique match identifier
  - `user_a` (uuid) - First user in the match
  - `user_b` (uuid) - Second user in the match
  - `status` (text) - Match status: 'pending', 'accepted', 'declined', 'completed'
  - `proposed_by` (uuid) - User who initiated the match
  - `restaurant_suggestions` (jsonb) - Array of suggested restaurant data
  - `selected_restaurant` (jsonb) - Selected restaurant details
  - `meeting_time` (timestamptz) - Scheduled lunch meeting time
  - `feedback_a` (jsonb) - User A's post-lunch feedback
  - `feedback_b` (jsonb) - User B's post-lunch feedback
  - `created_at` (timestamptz) - Match creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `messages`
  Real-time chat messages between matched users
  - `id` (uuid, primary key) - Unique message identifier
  - `match_id` (uuid) - Reference to the match
  - `sender_id` (uuid) - User who sent the message
  - `content` (text) - Message content
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  
  All tables have Row Level Security (RLS) enabled with the following policies:

  ### users table policies:
  - Users can view all available users (for discovery)
  - Users can only update their own profile
  - Users can only insert their own profile

  ### matches table policies:
  - Users can view matches they are part of
  - Users can create matches (propose lunch)
  - Users can update matches they are part of (accept/decline)

  ### messages table policies:
  - Users can view messages in their matches
  - Users can send messages in their matches

  ## Indexes
  - Location-based queries on users (lat, lon)
  - Match lookups by user
  - Message queries by match_id
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text DEFAULT '',
  interests text[] DEFAULT '{}',
  lat double precision,
  lon double precision,
  is_available boolean DEFAULT false,
  available_until timestamptz,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user_b uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  proposed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  restaurant_suggestions jsonb DEFAULT '[]',
  selected_restaurant jsonb,
  meeting_time timestamptz,
  feedback_a jsonb,
  feedback_b jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT different_users CHECK (user_a != user_b),
  CONSTRAINT ordered_users CHECK (user_a < user_b)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view all available users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Matches table policies
CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = proposed_by AND (auth.uid() = user_a OR auth.uid() = user_b));

CREATE POLICY "Users can update their matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- Messages table policies
CREATE POLICY "Users can view messages in their matches"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their matches"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
      AND matches.status = 'accepted'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_location ON users(lat, lon) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_users_available ON users(is_available, available_until);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id, created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();