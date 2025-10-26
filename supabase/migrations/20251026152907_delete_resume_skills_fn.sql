CREATE OR REPLACE FUNCTION delete_resume_skills(
    rs_ids UUID[]
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM resume_skills
    WHERE id = ANY(rs_ids) AND user_id = auth.uid();

    RETURN NOW();
END;
$$;