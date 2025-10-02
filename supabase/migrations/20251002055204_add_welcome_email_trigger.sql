/*
  # Add Welcome Email Trigger
  
  1. Purpose
    - Automatically send welcome email when users sign up
    - Call the send-welcome-email edge function
    - Extract user info from auth metadata
  
  2. Implementation
    - Create function to trigger welcome email
    - Add trigger on auth.users table for new signups
    - Pass email and full name to edge function
  
  3. Security
    - Uses service role to call edge function
    - Only triggers on INSERT events
    - Gracefully handles errors without blocking signup
*/

-- Create function to send welcome email
CREATE OR REPLACE FUNCTION public.send_welcome_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_full_name text;
  v_email text;
BEGIN
  v_email := NEW.email;
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'email', v_email,
        'fullName', v_full_name
      )
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_send_welcome ON auth.users;

-- Create trigger to send welcome email on signup
CREATE TRIGGER on_auth_user_created_send_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_trigger();

-- Note: This trigger works alongside the existing profile creation trigger
-- The welcome email will be sent after the user account is created