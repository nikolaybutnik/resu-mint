-- Update upsert_project_bullets function to include user_id for new bullet inserts
CREATE OR REPLACE FUNCTION upsert_project_bullets(bullets JSONB)
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
            (value->>'projectId')::UUID as project_id,
            (value->>'text') as text,
            COALESCE((value->>'isLocked')::BOOLEAN, false) as is_locked,
            COALESCE((value->>'position')::INTEGER, 0) as position,
            auth.uid() as user_id
        FROM jsonb_array_elements(bullets) AS value
    ),
    upsert_result AS (
        INSERT INTO project_bullets (id, project_id, text, is_locked, position, user_id)
        SELECT id, project_id, text, is_locked, position, user_id
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
