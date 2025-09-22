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
            COALESCE((value->>'position')::INTEGER, 0) as position
        FROM jsonb_array_elements(bullets) AS value
    ),
    upsert_result AS (
        INSERT INTO experience_bullets (id, experience_id, text, is_locked, position)
        SELECT id, experience_id, text, is_locked, position
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