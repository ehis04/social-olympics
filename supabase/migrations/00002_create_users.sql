-- Migration 00002: profiles table, age check, and auto-profile trigger

CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  avatar_url      text,
  country_code    char(2),
  city            text,
  bio             text,
  favourite_sport text,
  is_ghost        boolean NOT NULL DEFAULT false,
  claimed_by      uuid REFERENCES public.profiles(id),
  claimed_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 2 AND 30),
  CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 500)
);

-- Raises exception if the registering user is under 16
CREATE OR REPLACE FUNCTION public.check_minimum_age()
RETURNS trigger AS $$
BEGIN
  IF (
    SELECT EXTRACT(YEAR FROM AGE(NOW(), (NEW.raw_user_meta_data->>'date_of_birth')::date))
  ) < 16 THEN
    RAISE EXCEPTION 'User must be at least 16 years old';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_age_check
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL)
  EXECUTE FUNCTION public.check_minimum_age();

-- Auto-creates a profile row when a new auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, country_code, city, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'country_code',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'bio'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();