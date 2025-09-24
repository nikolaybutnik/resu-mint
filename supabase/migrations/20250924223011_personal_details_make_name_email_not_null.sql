-- Make name and email columns NOT NULL in personal_details table
-- First, handle existing NULL values with separate UPDATE statements
UPDATE personal_details
SET name = 'Unknown User'
WHERE name IS NULL;

UPDATE personal_details
SET email = 'user@example.com'
WHERE email IS NULL;

-- Add NOT NULL constraints to the columns
ALTER TABLE personal_details
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN email SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN personal_details.name IS 'User full name - required field';
COMMENT ON COLUMN personal_details.email IS 'User email address - required field';
