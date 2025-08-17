CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE experience
    ADD COLUMN IF NOT EXISTS start_month TEXT CHECK (start_month IS NULL OR start_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    ADD COLUMN IF NOT EXISTS start_year SMALLINT CHECK (start_year >= 1000 AND start_year <= 9999),
    ADD COLUMN IF NOT EXISTS end_month TEXT CHECK (end_month IS NULL OR end_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    ADD COLUMN IF NOT EXISTS end_year SMALLINT CHECK (end_year IS NULL OR (end_year >= 1000 AND end_year <= 9999)),
    ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_included BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS start_month TEXT CHECK (start_month IS NULL OR start_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    ADD COLUMN IF NOT EXISTS start_year SMALLINT CHECK (start_year >= 1000 AND start_year <= 9999),
    ADD COLUMN IF NOT EXISTS end_month TEXT CHECK (end_month IS NULL OR end_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    ADD COLUMN IF NOT EXISTS end_year SMALLINT CHECK (end_year IS NULL OR (end_year >= 1000 AND end_year <= 9999)),
    ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_included BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

UPDATE experience
SET
    start_month = CASE 
        WHEN start_date ->> 'month' IN ('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec') 
        THEN start_date ->> 'month' 
        ELSE NULL 
    END,
    start_year = NULLIF(start_date ->> 'year', '')::SMALLINT,
    end_month = CASE 
        WHEN end_date ->> 'month' IN ('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec') 
        THEN end_date ->> 'month' 
        ELSE NULL 
    END,
    end_year = NULLIF(end_date ->> 'year', '')::SMALLINT,
    is_present = COALESCE((end_date ->> 'isPresent')::BOOLEAN, FALSE)
WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

-- Ensure start_year is not null after migration
UPDATE experience 
SET 
    start_year = 2023 WHERE start_year IS NULL;
ALTER TABLE experience 
ALTER COLUMN start_year 
SET 
    NOT NULL; 

UPDATE projects
SET
    start_month = CASE 
        WHEN start_date ->> 'month' IN ('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec') 
        THEN start_date ->> 'month' 
        ELSE NULL 
    END,
    start_year = NULLIF(start_date ->> 'year', '')::SMALLINT,
    end_month = CASE 
        WHEN end_date ->> 'month' IN ('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec') 
        THEN end_date ->> 'month' 
        ELSE NULL 
    END,
    end_year = NULLIF(end_date ->> 'year', '')::SMALLINT,
    is_present = COALESCE((end_date ->> 'isPresent')::BOOLEAN, FALSE)
WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

-- Ensure start_year is not null after migration
UPDATE projects 
SET 
    start_year = 2023 WHERE start_year IS NULL;
ALTER TABLE projects 
ALTER COLUMN start_year 
SET 
    NOT NULL; 

CREATE TABLE IF NOT EXISTS experience_bullets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    experience_id UUID NOT NULL REFERENCES experience(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_bullets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO experience_bullets (experience_id, text, is_locked, position)
SELECT
    e.id,
    elem ->> 'text' AS text,
    COALESCE((elem ->> 'isLocked')::BOOLEAN, FALSE) AS is_locked,
    ordinality - 1 AS position
FROM experience e
CROSS JOIN LATERAL jsonb_array_elements(e.bullet_points) WITH ORDINALITY AS elem(elem, ordinality)
WHERE e.bullet_points IS NOT NULL;

INSERT INTO project_bullets (project_id, text, is_locked, position)
SELECT p.id,
       elem ->> 'text' AS text,
       COALESCE((elem ->> 'isLocked')::BOOLEAN, FALSE) AS is_locked,
       ordinality - 1 AS position
FROM projects p
CROSS JOIN LATERAL jsonb_array_elements(p.bullet_points) WITH ORDINALITY AS elem(elem, ordinality)
WHERE p.bullet_points IS NOT NULL;

-- Cleanup
ALTER TABLE experience 
    DROP COLUMN IF EXISTS start_date,
    DROP COLUMN IF EXISTS end_date,
    DROP COLUMN IF EXISTS bullet_points;

ALTER TABLE projects 
    DROP COLUMN IF EXISTS start_date,
    DROP COLUMN IF EXISTS end_date,
    DROP COLUMN IF EXISTS bullet_points;

CREATE INDEX IF NOT EXISTS idx_experience_user ON experience(user_id);
CREATE INDEX IF NOT EXISTS idx_experience_position ON experience(user_id, position);
CREATE INDEX IF NOT EXISTS idx_experience_bullets_exp ON experience_bullets(experience_id, position);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_position ON projects(user_id, position);
CREATE INDEX IF NOT EXISTS idx_project_bullets_proj ON project_bullets(project_id, position);

ALTER TABLE experience_bullets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_bullets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own experience bullets" ON experience_bullets
    FOR ALL USING (auth.uid() = (SELECT user_id FROM experience WHERE id = experience_bullets.experience_id));

CREATE POLICY "Users can manage own project bullets" ON project_bullets
    FOR ALL USING (auth.uid() = (SELECT user_id FROM projects WHERE id = project_bullets.project_id));

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_set_updated_at') THEN
        CREATE TRIGGER experience_set_updated_at BEFORE UPDATE ON experience
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_bullets_set_updated_at') THEN
        CREATE TRIGGER experience_bullets_set_updated_at BEFORE UPDATE ON experience_bullets
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'projects_set_updated_at') THEN
        CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON projects
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_bullets_set_updated_at') THEN
        CREATE TRIGGER project_bullets_set_updated_at BEFORE UPDATE ON project_bullets
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    -- Missing trigger for personal details
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'personal_details_set_updated_at') THEN
        CREATE TRIGGER personal_details_set_updated_at BEFORE UPDATE ON personal_details
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;