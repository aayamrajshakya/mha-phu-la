-- Layer 1 onboarding: age range (replaces exact age for privacy)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_range text;

-- Preferred event radius from onboarding (mirrors localStorage fallback)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_radius integer NOT NULL DEFAULT 5;
