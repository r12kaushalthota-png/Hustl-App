/*
  # Fix RLS Policies for Profiles Table
  
  1. Purpose
    - Add missing INSERT policy for profile creation
    - Ensure users can create and update their own profiles
    - Allow upsert operations to work correctly
  
  2. Changes
    - Add INSERT policy for users to create their own profile
    - Ensure UPDATE policy exists with proper checks
    - Keep SELECT policy for public viewing
  
  3. Security
    - Users can only insert/update their own profile (auth.uid() = id)
    - All users can view profiles (for task browsing, chat, etc.)
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Allow users to view all profiles (needed for task browsing, chat, reviews)
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);