CREATE OR REPLACE FUNCTION upsert_experience_bullets(
    b_ids UUID[],
    b_experience_ids UUID[],
    b_texts TEXT[],
    b_is_locked BOOLEAN[],
    b_positions INTEGER[]
) RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH input_data AS (
        SELECT 
            UNNEST(b_ids) AS id,
            UNNEST(b_experience_ids) AS experience_id,
            UNNEST(b_texts) AS text,
            UNNEST(b_is_locked) AS is_locked,
            UNNEST(b_positions) AS position
    ),
    upsert AS (
        INSERT INTO experience_bullets (id, experience_id, text, is_locked, position)
        SELECT id, experience_id, text, is_locked, position
        FROM input_data
        ON CONFLICT (id) DO UPDATE SET
            text = EXCLUDED.text,
            is_locked = EXCLUDED.is_locked,
            position = EXCLUDED.position
        RETURNING updated_at
    )
    SELECT MAX(updated_at) FROM upsert;
$$;