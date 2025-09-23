-- Add user_id column to project_bullets for Electric sync (matching experience_bullets)
ALTER TABLE project_bullets ADD COLUMN user_id UUID;

-- Populate user_id from parent projects table
UPDATE project_bullets
SET user_id = projects.user_id
FROM projects
WHERE project_bullets.project_id = projects.id;

-- Make user_id NOT NULL after populating
ALTER TABLE project_bullets ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE project_bullets
ADD CONSTRAINT project_bullets_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the old policy that uses a JOIN to projects table
DROP POLICY IF EXISTS "Users can manage own project bullets" ON project_bullets;

-- Create new policy that uses the direct user_id column (matching experience_bullets)
CREATE POLICY "Users can manage their project bullets." ON project_bullets
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
