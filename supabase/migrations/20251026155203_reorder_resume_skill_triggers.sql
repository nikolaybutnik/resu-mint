CREATE OR REPLACE FUNCTION reorder_resume_skills_positions_on_delete()
RETURNS trigger AS $$
BEGIN
    WITH numbered_resume_skills AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM resume_skills
        WHERE user_id = OLD.user_id
    )
    UPDATE resume_skills
    SET position = numbered_resume_skills.new_position,
        updated_at = NOW()
    FROM numbered_resume_skills
    WHERE resume_skills.id = numbered_resume_skills.id
      AND resume_skills.position != numbered_resume_skills.new_position;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder resume_skills positions after insertion
CREATE OR REPLACE FUNCTION reorder_resume_skills_positions_on_insert()
RETURNS trigger AS $$
BEGIN
    -- Reorder positions for all resume_skills of the same user
    WITH numbered_resume_skills AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS new_position
        FROM resume_skills
        WHERE user_id = NEW.user_id
    )
    UPDATE resume_skills
    SET position = numbered_resume_skills.new_position,
        updated_at = CASE WHEN resume_skills.id = NEW.id THEN NEW.updated_at ELSE NOW() END
    FROM numbered_resume_skills
    WHERE resume_skills.id = numbered_resume_skills.id
      AND resume_skills.position != numbered_resume_skills.new_position;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'resume_skills_reorder_positions_delete_trigger') THEN
        CREATE TRIGGER resume_skills_reorder_positions_delete_trigger
        AFTER DELETE ON resume_skills
        FOR EACH ROW EXECUTE FUNCTION reorder_resume_skills_positions_on_delete();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'resume_skills_reorder_positions_insert_trigger') THEN
        CREATE TRIGGER resume_skills_reorder_positions_insert_trigger
        AFTER INSERT ON resume_skills
        FOR EACH ROW EXECUTE FUNCTION reorder_resume_skills_positions_on_insert();
    END IF;
END $$;