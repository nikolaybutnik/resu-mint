-- Enable RLS and update policy to use the new user_id column
ALTER TABLE experience_bullets ENABLE ROW LEVEL SECURITY;

-- Drop the old policy that uses a JOIN to experience table
DROP POLICY IF EXISTS "Users can manage own experience bullets" ON experience_bullets;

-- Create new policy that uses the direct user_id column
CREATE POLICY "Users can manage their experience bullets." ON experience_bullets
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);