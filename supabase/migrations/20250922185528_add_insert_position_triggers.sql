-- Function to reorder experience positions after insertion
CREATE OR REPLACE FUNCTION reorder_experience_positions_on_insert()
RETURNS trigger AS $$
BEGIN
    -- Reorder positions for all experiences of the same user
    WITH numbered_experiences AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM experience
        WHERE user_id = NEW.user_id
    )
    UPDATE experience
    SET position = numbered_experiences.new_position,
        updated_at = CASE WHEN experience.id = NEW.id THEN NEW.updated_at ELSE NOW() END
    FROM numbered_experiences
    WHERE experience.id = numbered_experiences.id
      AND experience.position != numbered_experiences.new_position;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder project positions after insertion
CREATE OR REPLACE FUNCTION reorder_project_positions_on_insert()
RETURNS trigger AS $$
BEGIN
    -- Reorder positions for all projects of the same user
    WITH numbered_projects AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM projects
        WHERE user_id = NEW.user_id
    )
    UPDATE projects
    SET position = numbered_projects.new_position,
        updated_at = CASE WHEN projects.id = NEW.id THEN NEW.updated_at ELSE NOW() END
    FROM numbered_projects
    WHERE projects.id = numbered_projects.id
      AND projects.position != numbered_projects.new_position;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder bullet positions after insertion
CREATE OR REPLACE FUNCTION reorder_bullet_positions_on_insert()
RETURNS trigger AS $$
BEGIN
    -- Reorder positions for the affected experience
    WITH numbered_bullets AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM experience_bullets 
        WHERE experience_id = NEW.experience_id
    )
    UPDATE experience_bullets 
    SET position = numbered_bullets.new_position,
        updated_at = CASE WHEN experience_bullets.id = NEW.id THEN NEW.updated_at ELSE NOW() END
    FROM numbered_bullets 
    WHERE experience_bullets.id = numbered_bullets.id
      AND experience_bullets.position != numbered_bullets.new_position;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder project bullet positions after insertion
CREATE OR REPLACE FUNCTION reorder_project_bullet_positions_on_insert()
RETURNS trigger AS $$
BEGIN
    WITH numbered_bullets AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM project_bullets 
        WHERE project_id = NEW.project_id
    )
    UPDATE project_bullets 
    SET position = numbered_bullets.new_position,
        updated_at = CASE WHEN project_bullets.id = NEW.id THEN NEW.updated_at ELSE NOW() END
    FROM numbered_bullets 
    WHERE project_bullets.id = numbered_bullets.id
      AND project_bullets.position != numbered_bullets.new_position;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create insertion triggers
DO $$
BEGIN
    -- Experience position reordering trigger on insert/update
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER experience_reorder_positions_insert_trigger
        AFTER INSERT OR UPDATE OF position ON experience
        FOR EACH ROW EXECUTE FUNCTION reorder_experience_positions_on_insert();
    END IF;

    -- Project position reordering trigger on insert/update
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER project_reorder_positions_insert_trigger
        AFTER INSERT OR UPDATE OF position ON projects
        FOR EACH ROW EXECUTE FUNCTION reorder_project_positions_on_insert();
    END IF;

    -- Experience bullet position reordering trigger on insert/update
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_bullets_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER experience_bullets_reorder_positions_insert_trigger
        AFTER INSERT OR UPDATE OF position ON experience_bullets
        FOR EACH ROW EXECUTE FUNCTION reorder_bullet_positions_on_insert();
    END IF;

    -- Project bullet position reordering trigger on insert/update
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_bullets_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER project_bullets_reorder_positions_insert_trigger
        AFTER INSERT OR UPDATE OF position ON project_bullets
        FOR EACH ROW EXECUTE FUNCTION reorder_project_bullet_positions_on_insert();
    END IF;
END $$;
