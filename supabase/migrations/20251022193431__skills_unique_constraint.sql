-- Add unique constraint on user_id for skills table (one record per user)
CREATE UNIQUE INDEX IF NOT EXISTS skills_user_unique ON skills(user_id);
