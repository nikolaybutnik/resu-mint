CREATE OR REPLACE FUNCTION delete_experience_bullets(
    b_ids UUID[]
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM experience_bullets 
    WHERE id = ANY(b_ids) AND experience_id IN (
        SELECT id FROM experience WHERE user_id = auth.uid()
    );
    
    RETURN NOW();
END;
$$;
