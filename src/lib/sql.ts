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
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
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
    timestamp TEXT NOT NULL,
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
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (id) DO UPDATE 
    SET name=$2, email=$3, phone=$4, location=$5, linkedin=$6, github=$7, website=$8, updated_at=$9
`

export const insertPersonalDetailsChangelogQuery = `
INSERT INTO personal_details_changes (operation, value, write_id, timestamp)
    VALUES ($1, $2, $3, $4)
`
