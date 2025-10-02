/*
  # Enforce UFL Email Domain for Signups
  
  1. Purpose
    - Restrict signups to only @ufl.edu email addresses
    - Prevent registration with any other email domain
  
  2. Implementation
    - Create validation function to check email domain
    - Add trigger on auth.users table to enforce validation
    - Block any signup attempts with non-@ufl.edu emails
  
  3. Security
    - Server-side validation that cannot be bypassed by client
    - Runs before user record is created in database
    - Returns clear error message for invalid emails
  
  Important Notes:
    - This is a database-level constraint that cannot be bypassed
    - Existing users with non-@ufl.edu emails are not affected
    - Only new signups are validated
*/

-- Create function to validate UFL email domain
CREATE OR REPLACE FUNCTION public.validate_ufl_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if email ends with @ufl.edu (case insensitive)
  IF NEW.email IS NULL OR NOT (LOWER(NEW.email) LIKE '%@ufl.edu') THEN
    RAISE EXCEPTION 'Only @ufl.edu email addresses are allowed to register'
      USING HINT = 'Please use your University of Florida email address';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_ufl_email_on_signup ON auth.users;

-- Create trigger to enforce UFL email validation on signup
CREATE TRIGGER enforce_ufl_email_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ufl_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_ufl_email TO anon, authenticated;