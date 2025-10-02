/*
  # Add class_year field to profiles table
  
  1. Purpose
    - Add academic year/class year field to profiles
    - Support student year tracking (Freshman, Sophomore, Junior, Senior, Graduate)
  
  2. Changes
    - Add class_year column to profiles table
    - Set default value to empty string
    - No constraints to allow flexibility
  
  3. Security
    - No RLS changes needed (inherits from existing policies)
*/

-- Add class_year column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'class_year'
  ) THEN
    ALTER TABLE profiles ADD COLUMN class_year text DEFAULT '';
  END IF;
END $$;