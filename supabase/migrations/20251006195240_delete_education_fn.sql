CREATE OR REPLACE FUNCTION  delete_education(
    e_ids UUID[]
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM education
    WHERE id = ANY(e_ids) AND user_id = auth.uid();

    RETURN NOW();
END;
$$;