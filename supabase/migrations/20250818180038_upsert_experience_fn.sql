CREATE OR REPLACE FUNCTION upsert_experience(
    e_id UUID,
    e_title TEXT,
    e_company_name TEXT,
    e_location TEXT,
    e_start_month TEXT,
    e_start_year SMALLINT,
    e_end_month TEXT,
    e_end_year SMALLINT,
    e_is_present BOOLEAN,
    e_description TEXT,
    e_is_included BOOLEAN,
    e_position INTEGER
) RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH upsert AS (
        INSERT INTO experience (
            id, user_id, title, company_name, location, 
            start_month, start_year, end_month, end_year, is_present,
            description, is_included, position
        )
        VALUES (
            e_id, auth.uid(), e_title, e_company_name, e_location,
            e_start_month, e_start_year, e_end_month, e_end_year, e_is_present,
            e_description, e_is_included, e_position
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            company_name = EXCLUDED.company_name,
            location = EXCLUDED.location,
            start_month = EXCLUDED.start_month,
            start_year = EXCLUDED.start_year,
            end_month = EXCLUDED.end_month,
            end_year = EXCLUDED.end_year,
            is_present = EXCLUDED.is_present,
            description = EXCLUDED.description,
            is_included = EXCLUDED.is_included,
            position = EXCLUDED.position
        RETURNING updated_at
    )
    SELECT updated_at FROM upsert;
$$;