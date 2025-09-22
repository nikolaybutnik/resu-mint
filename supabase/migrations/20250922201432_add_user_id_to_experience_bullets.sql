-- Add user_id column to experience_bullets for Electric sync
ALTER TABLE experience_bullets ADD COLUMN user_id UUID;

-- Populate user_id from parent experience table
UPDATE experience_bullets 
SET user_id = experience.user_id 
FROM experience 
WHERE experience_bullets.experience_id = experience.id;

-- Make user_id NOT NULL after populating
ALTER TABLE experience_bullets ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE experience_bullets 
ADD CONSTRAINT experience_bullets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update the upsert_experience_bullets function to handle user_id
CREATE OR REPLACE FUNCTION upsert_experience_bullets(bullets JSONB)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    max_updated_at TIMESTAMPTZ;
BEGIN
    WITH bullet_values AS (
        SELECT
            (value->>'id')::UUID as id,
            (value->>'experienceId')::UUID as experience_id,
            (value->>'text') as text,
            COALESCE((value->>'isLocked')::BOOLEAN, false) as is_locked,
            COALESCE((value->>'position')::INTEGER, 0) as position,
            auth.uid() as user_id
        FROM jsonb_array_elements(bullets) AS value
    ),
    upsert_result AS (
        INSERT INTO experience_bullets (id, experience_id, text, is_locked, position, user_id)
        SELECT id, experience_id, text, is_locked, position, user_id
        FROM bullet_values
        ON CONFLICT (id) DO UPDATE SET
            text = EXCLUDED.text,
            is_locked = EXCLUDED.is_locked,
            position = EXCLUDED.position,
            updated_at = NOW()
        RETURNING updated_at
    )
    SELECT MAX(updated_at) INTO max_updated_at FROM upsert_result;

    RETURN COALESCE(max_updated_at, NOW());
END;
$$;
