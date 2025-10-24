CREATE OR REPLACE FUNCTION upsert_resume_skills(
    rs_id UUID,
    rs_title TEXT,
    rs_skills TEXT[],
    rs_is_included BOOLEAN,
    rs_position INTEGER
) RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH upsert AS (
        INSERT INTO resume_skills (id, user_id, title, skills, is_included, position)
        VALUES (rs_id, auth.uid(), rs_title, rs_skills, rs_is_included, rs_position)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            skills = EXCLUDED.skills,
            is_included = EXCLUDED.is_included,
            position = EXCLUDED.position,
            updated_at = NOW()
        RETURNING updated_at
    )
    SELECT updated_at FROM upsert;
$$;