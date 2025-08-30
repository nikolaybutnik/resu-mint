export const initializePersonalDetailsQuery = `
CREATE TABLE IF NOT EXISTS personal_details (
    id UUID PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    location TEXT,
    linkedin TEXT,
    github TEXT,
    website TEXT,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);
`

/*
operation: 'insert' | 'update' | 'delete'
value: snapshot of the row being changed (like your PersonalDetails object)
write_id: UUID per mutation, for tracking / deduplication
timestamp: when change was made
*/
export const initializePersonalDetailsChangelogQuery = `
CREATE TABLE IF NOT EXISTS personal_details_changes (
    id BIGSERIAL PRIMARY KEY,
    operation TEXT NOT NULL, 
    value JSONB NOT NULL,
    write_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ,
    synced BOOLEAN DEFAULT FALSE
)
`

export const getPersonalDetailsQuery = `
SELECT id, name, email, phone, location, linkedin, github, website, updated_at 
    FROM personal_details 
    LIMIT 1
`

export const upsertPersonalDetailsQuery = `
INSERT INTO personal_details (id, name, email, phone, location, linkedin, github, website, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz)
    ON CONFLICT (id) DO UPDATE 
    SET name=EXCLUDED.name, email=EXCLUDED.email, phone=EXCLUDED.phone, 
        location=EXCLUDED.location, linkedin=EXCLUDED.linkedin, github=EXCLUDED.github, 
        website=EXCLUDED.website, updated_at=EXCLUDED.updated_at
`

export const insertPersonalDetailsChangelogQuery = `
INSERT INTO personal_details_changes (operation, value, write_id, timestamp)
    VALUES ($1, $2, $3, $4)
`

export const updatePersonalDetailChangelogQuery = `
UPDATE personal_details_changes SET synced = $1 WHERE write_id = $2
`

export const selectUnsyncedRowsQuery = `
SELECT * FROM personal_details_changes WHERE synced = FALSE ORDER BY id ASC
`
