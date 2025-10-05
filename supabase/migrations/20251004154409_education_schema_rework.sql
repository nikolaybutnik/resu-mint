-- Normalize education table to match experience and projects structure

-- Add new columns
ALTER TABLE education
    ADD COLUMN IF NOT EXISTS start_month TEXT CHECK (start_month IS NULL OR start_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    ADD COLUMN IF NOT EXISTS start_year SMALLINT CHECK (start_year IS NULL OR (start_year >= 1000 AND start_year <= 9999)),
    ADD COLUMN IF NOT EXISTS end_month TEXT CHECK (end_month IS NULL OR end_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    ADD COLUMN IF NOT EXISTS end_year SMALLINT CHECK (end_year IS NULL OR (end_year >= 1000 AND end_year <= 9999)),
    ADD COLUMN IF NOT EXISTS is_included BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Migrate data from JSONB to new columns
UPDATE education
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
    end_year = NULLIF(end_date ->> 'year', '')::SMALLINT
WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

-- Drop old JSONB columns
ALTER TABLE education 
    DROP COLUMN IF EXISTS start_date,
    DROP COLUMN IF EXISTS end_date;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_education_user ON education(user_id);
CREATE INDEX IF NOT EXISTS idx_education_position ON education(user_id, position);

-- Function to reorder education positions after deletion
CREATE OR REPLACE FUNCTION reorder_education_positions()
RETURNS trigger AS $$
BEGIN
    -- Reorder positions for all education entries of the same user
    WITH numbered_education AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM education
        WHERE user_id = OLD.user_id
    )
    UPDATE education
    SET position = numbered_education.new_position,
        updated_at = NOW()
    FROM numbered_education
    WHERE education.id = numbered_education.id
        AND education.position != numbered_education.new_position;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder education positions after insertion
CREATE OR REPLACE FUNCTION reorder_education_positions_on_insert()
RETURNS trigger AS $$
BEGIN
    -- Reorder positions for all education entries of the same user
    WITH numbered_education AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM education
        WHERE user_id = NEW.user_id
    )
    UPDATE education
    SET position = numbered_education.new_position,
        updated_at = CASE WHEN education.id = NEW.id THEN NEW.updated_at ELSE NOW() END
    FROM numbered_education
    WHERE education.id = numbered_education.id
      AND education.position != numbered_education.new_position;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for position reordering
DO $$
BEGIN
    -- Education position reordering trigger on delete
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'education_reorder_positions_trigger') THEN
        CREATE TRIGGER education_reorder_positions_trigger
        AFTER DELETE ON education
        FOR EACH ROW EXECUTE FUNCTION reorder_education_positions();
    END IF;

    -- Education position reordering trigger on insert
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'education_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER education_reorder_positions_insert_trigger
        AFTER INSERT ON education
        FOR EACH ROW EXECUTE FUNCTION reorder_education_positions_on_insert();
    END IF;

    -- Education updated_at trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'education_set_updated_at') THEN
        CREATE TRIGGER education_set_updated_at BEFORE UPDATE ON education
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

COMMENT ON COLUMN education.id IS 'Unique identifier for the education entry';
COMMENT ON COLUMN education.user_id IS 'Reference to the user who owns this education entry';
COMMENT ON COLUMN education.institution IS 'Name of the educational institution (e.g., University of Example)';
COMMENT ON COLUMN education.degree IS 'Degree obtained or pursued (e.g., Bachelor of Science, Computer Science)';
COMMENT ON COLUMN education.degree_status IS 'Status of degree completion (e.g., Completed, In Progress)';
COMMENT ON COLUMN education.location IS 'Location of the educational institution';
COMMENT ON COLUMN education.description IS 'Description or notes on the tasks or courses taken';
COMMENT ON COLUMN education.start_month IS 'Start month (e.g., Jan, Feb, etc.) - optional';
COMMENT ON COLUMN education.start_year IS 'Start year (e.g., 2020) - optional';
COMMENT ON COLUMN education.end_month IS 'End month (e.g., Jan, Feb, etc.) - optional';
COMMENT ON COLUMN education.end_year IS 'End year (e.g., 2024) - optional';
COMMENT ON COLUMN education.is_included IS 'Whether this education entry should be included in the resume preview';
COMMENT ON COLUMN education.position IS 'Display order of education entries';
COMMENT ON COLUMN education.created_at IS 'Timestamp when the education entry was created';
COMMENT ON COLUMN education.updated_at IS 'Timestamp when the education entry was last updated';

