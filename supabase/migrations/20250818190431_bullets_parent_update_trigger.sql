CREATE OR REPLACE FUNCTION update_parent_experience_timestamp()
RETURNS trigger AS  $$
BEGIN
    -- When bullets get updated, the updated_at of the parent experience block gets updated too.
    UPDATE experience
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.experience_id, OLD.experience_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_parent_project_timestamp()
RETURNS trigger AS  $$
BEGIN
    UPDATE projects
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_bullets_update_parent_trigger') THEN
        CREATE TRIGGER experience_bullets_update_parent_trigger
        AFTER INSERT OR UPDATE ON experience_bullets
        FOR EACH ROW EXECUTE FUNCTION update_parent_experience_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'experience_bullets_delete_parent_trigger') THEN
        CREATE TRIGGER experience_bullets_delete_parent_trigger
        AFTER DELETE ON experience_bullets
        FOR EACH ROW EXECUTE FUNCTION update_parent_experience_timestamp();
    END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_bullets_update_parent_trigger') THEN
        CREATE TRIGGER project_bullets_update_parent_trigger
        AFTER INSERT OR UPDATE ON project_bullets
        FOR EACH ROW EXECUTE FUNCTION update_parent_project_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_bullets_delete_parent_trigger') THEN
        CREATE TRIGGER project_bullets_delete_parent_trigger
        AFTER DELETE ON project_bullets
        FOR EACH ROW EXECUTE FUNCTION update_parent_project_timestamp();
    END IF;
END $$;