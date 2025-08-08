CREATE OR REPLACE FUNCTION upsert_personal_details(
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_location TEXT,
    p_linkedin TEXT,
    p_github TEXT,
    p_website TEXT
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    INSERT INTO personal_details (user_id, name, email, phone, location, linkedin, github, website)
    VALUES (auth.uid(), p_name, p_email, p_phone, p_location, p_linkedin, p_github, p_website)
    ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        location = EXCLUDED.location,
        linkedin = EXCLUDED.linkedin,
        github = EXCLUDED.github,
        website = EXCLUDED.website,
        updated_at = NOW();
$$;