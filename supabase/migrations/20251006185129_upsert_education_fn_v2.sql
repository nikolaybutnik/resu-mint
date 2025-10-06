-- Update upsert_education function to handle empty strings and zeros properly
CREATE OR REPLACE FUNCTION upsert_education(
    e_id UUID,
    e_institution TEXT,
    e_degree TEXT,
    e_degree_status TEXT,
    e_location TEXT,
    e_description TEXT,
    e_start_month TEXT,
    e_start_year SMALLINT,
    e_end_month TEXT,
    e_end_year SMALLINT,
    e_is_included BOOLEAN,
    e_position INTEGER
) RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH upsert AS (
        INSERT INTO education (
            id, 
            user_id, 
            institution, 
            degree, 
            degree_status, 
            location, 
            description,
            start_month, 
            start_year, 
            end_month, 
            end_year, 
            is_included, 
            position
        )
        VALUES (
            e_id, 
            auth.uid(), 
            e_institution, 
            e_degree, 
            NULLIF(e_degree_status, ''), 
            NULLIF(e_location, ''), 
            NULLIF(e_description, ''),
            NULLIF(e_start_month, ''), 
            NULLIF(e_start_year, 0), 
            NULLIF(e_end_month, ''), 
            NULLIF(e_end_year, 0), 
            e_is_included, 
            e_position
        )
        ON CONFLICT (id) DO UPDATE SET
            institution = EXCLUDED.institution,
            degree = EXCLUDED.degree,
            degree_status = EXCLUDED.degree_status,
            location = EXCLUDED.location,
            description = EXCLUDED.description,
            start_month = EXCLUDED.start_month,
            start_year = EXCLUDED.start_year,
            end_month = EXCLUDED.end_month,
            end_year = EXCLUDED.end_year,
            is_included = EXCLUDED.is_included,
            position = EXCLUDED.position
        RETURNING updated_at
    )
    SELECT updated_at FROM upsert;
$$;
