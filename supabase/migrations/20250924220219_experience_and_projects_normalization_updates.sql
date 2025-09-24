-- Rename reorder_bullet_positions to reorder_experience_bullet_positions for clarity
-- Drop triggers first (they depend on the functions)
DROP TRIGGER IF EXISTS experience_bullets_reorder_positions_trigger ON experience_bullets;
DROP TRIGGER IF EXISTS experience_bullets_reorder_positions_insert_trigger ON experience_bullets;

-- Drop the old functions
DROP FUNCTION IF EXISTS reorder_bullet_positions();
DROP FUNCTION IF EXISTS reorder_bullet_positions_on_insert();

-- Create the new functions with clearer names
CREATE OR REPLACE FUNCTION reorder_experience_bullet_positions()
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

CREATE OR REPLACE FUNCTION reorder_experience_bullet_positions_on_insert()
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

-- Create the new triggers with the same names but using the new functions
CREATE TRIGGER experience_bullets_reorder_positions_trigger
    AFTER DELETE ON experience_bullets
    FOR EACH ROW EXECUTE FUNCTION reorder_experience_bullet_positions();

CREATE TRIGGER experience_bullets_reorder_positions_insert_trigger
    AFTER INSERT OR UPDATE OF position ON experience_bullets
    FOR EACH ROW EXECUTE FUNCTION reorder_experience_bullet_positions_on_insert();