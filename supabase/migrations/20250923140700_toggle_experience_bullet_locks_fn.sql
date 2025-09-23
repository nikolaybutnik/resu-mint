CREATE OR REPLACE FUNCTION update_experience_bullet_locks(bullet_data JSONB)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE experience_bullets
    SET is_locked = bullet_values.is_locked,
        updated_at = NOW()
    FROM (
        SELECT
            (value->>'id')::UUID as id,
            (value->>'isLocked')::BOOLEAN as is_locked
        FROM jsonb_array_elements(bullet_data) AS value
    ) AS bullet_values
    WHERE experience_bullets.id = bullet_values.id
    AND experience_bullets.user_id = auth.uid();
$$;