CREATE OR REPLACE FUNCTION upsert_skills(
    s_hard_skills TEXT[],
    s_hard_suggestions TEXT[],
    s_soft_skills TEXT[],
    s_soft_suggestions TEXT[]
) RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH upsert AS (
        INSERT INTO skills (user_id, hard_skills, hard_suggestions, soft_skills, soft_suggestions)
        VALUES (auth.uid(), s_hard_skills, s_hard_suggestions, s_soft_skills, s_soft_suggestions)
        ON CONFLICT (user_id) DO UPDATE SET
            hard_skills = EXCLUDED.hard_skills,
            hard_suggestions = EXCLUDED.hard_suggestions,
            soft_skills = EXCLUDED.soft_skills,
            soft_suggestions = EXCLUDED.soft_suggestions,
            updated_at = NOW()
        RETURNING updated_at
    )
    SELECT updated_at FROM upsert;
$$;