-- Function to reorder experience positions after deletion
CREATE OR REPLACE FUNCTION reorder_experience_positions()
RETURNS trigger AS $$
BEGIN
    -- Reorder positions for all experiences of the same user
    WITH numbered_experiences AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM experience
        WHERE user_id = OLD.user_id
    )
    UPDATE experience
    SET position = numbered_experiences.new_position,
        updated_at = NOW()
    FROM numbered_experiences
    WHERE experience.id = numbered_experiences.id
      AND experience.position != numbered_experiences.new_position;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder project positions after deletion
CREATE OR REPLACE FUNCTION reorder_project_positions()
RETURNS trigger AS $$
BEGIN
    -- Reorder positions for all projects of the same user
    WITH numbered_projects AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM projects
        WHERE user_id = OLD.user_id
    )
    UPDATE projects
    SET position = numbered_projects.new_position,
        updated_at = NOW()
    FROM numbered_projects
    WHERE projects.id = numbered_projects.id
      AND projects.position != numbered_projects.new_position;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder bullet positions after deletion
CREATE OR REPLACE FUNCTION reorder_bullet_positions()
RETURNS trigger AS $$
BEGIN
    -- Reorder positions for the affected experience
    WITH numbered_bullets AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM experience_bullets 
        WHERE experience_id = OLD.experience_id
    )
    UPDATE experience_bullets 
    SET position = numbered_bullets.new_position,
        updated_at = NOW()
    FROM numbered_bullets 
    WHERE experience_bullets.id = numbered_bullets.id
      AND experience_bullets.position != numbered_bullets.new_position;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder project bullet positions after deletion (for consistency)
CREATE OR REPLACE FUNCTION reorder_project_bullet_positions()
RETURNS trigger AS $$
BEGIN
    WITH numbered_bullets AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM project_bullets 
        WHERE project_id = OLD.project_id
    )
    UPDATE project_bullets 
    SET position = numbered_bullets.new_position,
        updated_at = NOW()
    FROM numbered_bullets 
    WHERE project_bullets.id = numbered_bullets.id
      AND project_bullets.position != numbered_bullets.new_position;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DO $$
BEGIN
    -- Experience position reordering trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_reorder_positions_trigger') THEN
        CREATE TRIGGER experience_reorder_positions_trigger
        AFTER DELETE ON experience
        FOR EACH ROW EXECUTE FUNCTION reorder_experience_positions();
    END IF;

    -- Project position reordering trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_reorder_positions_trigger') THEN
        CREATE TRIGGER project_reorder_positions_trigger
        AFTER DELETE ON projects
        FOR EACH ROW EXECUTE FUNCTION reorder_project_positions();
    END IF;

    -- Experience bullet position reordering trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_bullets_reorder_positions_trigger') THEN
        CREATE TRIGGER experience_bullets_reorder_positions_trigger
        AFTER DELETE ON experience_bullets
        FOR EACH ROW EXECUTE FUNCTION reorder_bullet_positions();
    END IF;

    -- Project bullet position reordering trigger (for consistency)
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_bullets_reorder_positions_trigger') THEN
        CREATE TRIGGER project_bullets_reorder_positions_trigger
        AFTER DELETE ON project_bullets
        FOR EACH ROW EXECUTE FUNCTION reorder_project_bullet_positions();
    END IF;
END $$;
