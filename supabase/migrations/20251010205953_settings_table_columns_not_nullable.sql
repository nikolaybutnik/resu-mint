-- Add unique constraint on user_id
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_user_unique ON app_settings(user_id);

-- Make columns NOT NULL
ALTER TABLE app_settings
    ALTER COLUMN bullets_per_experience_block SET NOT NULL,
    ALTER COLUMN bullets_per_project_block SET NOT NULL,
    ALTER COLUMN max_chars_per_bullet SET NOT NULL,
    ALTER COLUMN language_model SET NOT NULL;

-- Convert section_order from JSONB to TEXT[]
ALTER TABLE app_settings ADD COLUMN section_order_temp TEXT[];
UPDATE app_settings SET section_order_temp = ARRAY(SELECT jsonb_array_elements_text(section_order));
ALTER TABLE app_settings DROP COLUMN section_order;
ALTER TABLE app_settings RENAME COLUMN section_order_temp TO section_order;

-- Make section_order NOT NULL
ALTER TABLE app_settings ALTER COLUMN section_order SET NOT NULL;

CREATE OR REPLACE FUNCTION upsert_settings(
    s_experience_bullets_per_block INTEGER,
    s_project_bullets_per_block INTEGER,
    s_max_chars_per_bullet INTEGER,
    s_language_model TEXT,
    s_section_order TEXT[]
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH upsert AS (
        INSERT INTO app_settings (
            user_id,
            bullets_per_experience_block,
            bullets_per_project_block,
            max_chars_per_bullet,
            language_model,
            section_order
        )
        VALUES (
            auth.uid(),
            s_experience_bullets_per_block, 
            s_project_bullets_per_block, 
            s_max_chars_per_bullet, 
            s_language_model, 
            s_section_order
        )
        ON CONFLICT (user_id) DO UPDATE SET
            bullets_per_experience_block = EXCLUDED.bullets_per_experience_block,
            bullets_per_project_block = EXCLUDED.bullets_per_project_block,
            max_chars_per_bullet = EXCLUDED.max_chars_per_bullet,
            language_model = EXCLUDED.language_model,
            section_order = EXCLUDED.section_order
        RETURNING updated_at
    )
    SELECT updated_at FROM upsert;
$$;

-- Add missing trigger for for app_settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'app_settings_set_updated_at') THEN
        CREATE TRIGGER app_settings_set_updated_at BEFORE UPDATE ON app_settings
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;