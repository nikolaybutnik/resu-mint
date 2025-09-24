CREATE OR REPLACE FUNCTION upsert_project(
    p_id UUID,
    p_title TEXT,
    p_link TEXT,
    p_technologies TEXT[],
    p_start_month TEXT,
    p_start_year SMALLINT,
    p_end_month TEXT,
    p_end_year SMALLINT,
    p_is_present BOOLEAN,
    p_description TEXT,
    p_is_included BOOLEAN,
    p_position INTEGER
) RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH upsert AS (
        INSERT INTO projects (
            id, user_id, title, link, technologies, 
            start_month, start_year, end_month, end_year, is_present,
            description, is_included, position
        )
        VALUES (
            p_id,
            auth.uid(),
            p_title,
            p_link,
            p_technologies,
            NULLIF(p_start_month, ''),
            p_start_year,
            NULLIF(p_end_month, ''),
            NULLIF(p_end_year, 0),
            p_is_present,
            NULLIF(p_description, ''),
            p_is_included,
            p_position
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            link = EXCLUDED.link,
            technologies = EXCLUDED.technologies,
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

CREATE OR REPLACE FUNCTION delete_project(
    p_ids UUID[]
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM projects
    WHERE id = ANY(p_ids) AND user_id = auth.uid();
    
    RETURN NOW();
END;
$$;

CREATE OR REPLACE FUNCTION upsert_project_bullets(bullets JSONB)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    max_updated_at TIMESTAMPTZ;
BEGIN
    WITH bullet_values AS (
        SELECT 
            (value->>'id')::UUID as id,
            (value->>'projectId')::UUID as project_id,
            (value->>'text') as text,
            COALESCE((value->>'isLocked')::BOOLEAN, false) as is_locked,
            COALESCE((value->>'position')::INTEGER, 0) as position
        FROM jsonb_array_elements(bullets) AS value
    )
    INSERT INTO project_bullets (id, project_id, text, is_locked, position)
    SELECT id, project_id, text, is_locked, position
    FROM bullet_values
    ON CONFLICT (id) DO UPDATE SET
        text = EXCLUDED.text,
        is_locked = EXCLUDED.is_locked,
        position = EXCLUDED.position,
        updated_at = NOW()
    RETURNING updated_at INTO max_updated_at;
    
    RETURN COALESCE(max_updated_at, NOW());
END;
$$;

CREATE OR REPLACE FUNCTION delete_project_bullets(
    b_ids UUID[]
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM project_bullets 
    WHERE id = ANY(b_ids) AND project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    );
    
    RETURN NOW();
END;
$$;