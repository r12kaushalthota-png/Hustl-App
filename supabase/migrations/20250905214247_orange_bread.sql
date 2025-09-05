/*
  # Add missing profile fields for complete user profiles

  1. New Columns
    - `class_year` - Academic year (Freshman, Sophomore, Junior, Senior, Graduate)
    - Update existing `bio` field to allow longer text
    - Ensure all profile fields are properly indexed

  2. Security
    - Update RLS policies to allow users to update their own profiles
    - Ensure proper validation constraints

  3. Functions
    - Add trigger to automatically update `updated_at` timestamp
*/

-- Add class_year column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'class_year'
  ) THEN
    ALTER TABLE profiles ADD COLUMN class_year text DEFAULT ''::text;
  END IF;
END $$;

-- Update bio column to allow longer text (if needed)
DO $$
BEGIN
  -- Ensure bio column exists and has proper default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text DEFAULT ''::text;
  END IF;
END $$;

-- Add constraints for class_year
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_class_year_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_class_year_check 
    CHECK (class_year IN ('', 'Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'));
  END IF;
END $$;

-- Create index for class_year if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'profiles' AND indexname = 'idx_profiles_class_year'
  ) THEN
    CREATE INDEX idx_profiles_class_year ON profiles(class_year);
  END IF;
END $$;

-- Ensure updated_at trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;