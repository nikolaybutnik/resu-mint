-- Drop the existing triggers that fire on UPDATE OF position
-- These were causing conflicts with manual reorder operations

DROP TRIGGER IF EXISTS experience_reorder_positions_insert_trigger ON experience;
DROP TRIGGER IF EXISTS project_reorder_positions_insert_trigger ON projects;
DROP TRIGGER IF EXISTS experience_bullets_reorder_positions_insert_trigger ON experience_bullets;
DROP TRIGGER IF EXISTS project_bullets_reorder_positions_insert_trigger ON project_bullets;

-- Recreate triggers to only fire on INSERT, not on position updates
-- This prevents conflicts with manual reorder operations

DO $$
BEGIN
    -- Experience position reordering trigger - INSERT ONLY
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER experience_reorder_positions_insert_trigger
        AFTER INSERT ON experience
        FOR EACH ROW EXECUTE FUNCTION reorder_experience_positions_on_insert();
    END IF;

    -- Project position reordering trigger - INSERT ONLY
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER project_reorder_positions_insert_trigger
        AFTER INSERT ON projects
        FOR EACH ROW EXECUTE FUNCTION reorder_project_positions_on_insert();
    END IF;

    -- Experience bullet position reordering trigger - INSERT ONLY
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_bullets_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER experience_bullets_reorder_positions_insert_trigger
        AFTER INSERT ON experience_bullets
        FOR EACH ROW EXECUTE FUNCTION reorder_bullet_positions_on_insert();
    END IF;

    -- Project bullet position reordering trigger - INSERT ONLY
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_bullets_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER project_bullets_reorder_positions_insert_trigger
        AFTER INSERT ON project_bullets
        FOR EACH ROW EXECUTE FUNCTION reorder_project_bullet_positions_on_insert();
    END IF;
END $$;
