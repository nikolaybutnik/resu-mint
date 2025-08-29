-- Fix all user_id columns to be NOT NULL
-- This prevents the issue where auth.uid() returning NULL creates invalid rows

-- First, delete any rows with NULL user_id (these are invalid and shouldn't exist)
-- This must be done BEFORE adding NOT NULL constraints
DELETE FROM personal_details WHERE user_id IS NULL;
DELETE FROM experience WHERE user_id IS NULL;
DELETE FROM projects WHERE user_id IS NULL;
DELETE FROM education WHERE user_id IS NULL;
DELETE FROM skills WHERE user_id IS NULL;
DELETE FROM app_settings WHERE user_id IS NULL;

-- Add NOT NULL constraints to all user_id columns
ALTER TABLE personal_details ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE experience ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE education ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE skills ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN user_id SET NOT NULL;