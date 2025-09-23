CREATE OR REPLACE FUNCTION update_experience_bullet_locks(
    bullet_ids UUID[],
    bullet_locks BOOLEAN[]
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE experience_bullets
    SET is_locked = bullet_values.is_locked,
        updated_at = NOW()
    FROM (
        SELECT 
            UNNEST(bullet_ids) AS id,
            UNNEST(bullet_locks) AS is_locked
    ) AS bullet_values
    WHERE experience_bullets.id = bullet_values.id
    AND experience_bullets.user_id = auth.uid();
$$;
