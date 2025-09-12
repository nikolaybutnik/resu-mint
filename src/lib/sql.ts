// =============================================================================
// TABLE INITIALIZATION QUERIES
// =============================================================================

// Personal Details Tables
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`

export const initializePersonalDetailsChangelogQuery = `
CREATE TABLE IF NOT EXISTS personal_details_changes (
    id BIGSERIAL PRIMARY KEY,
    operation TEXT NOT NULL, 
    value JSONB NOT NULL,
    write_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ,
    synced BOOLEAN DEFAULT FALSE,
    user_id UUID
);
`

// Experience Tables
export const initializeExperienceQuery = `
CREATE TABLE IF NOT EXISTS experience (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    start_month TEXT CHECK (start_month IS NULL OR start_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    start_year SMALLINT NOT NULL CHECK (start_year >= 1000 AND start_year <= 9999),
    end_month TEXT CHECK (end_month IS NULL OR end_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    end_year SMALLINT CHECK (end_year IS NULL OR (end_year >= 1000 AND end_year <= 9999)),
    is_present BOOLEAN DEFAULT FALSE,
    is_included BOOLEAN DEFAULT TRUE,
    position INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`

export const initializeExperienceBulletsQuery = `
CREATE TABLE IF NOT EXISTS experience_bullets (
    id UUID PRIMARY KEY,
    experience_id UUID NOT NULL REFERENCES experience(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);
`

export const initializeExperienceChangelogQuery = `
CREATE TABLE IF NOT EXISTS experience_changes (
    id BIGSERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    value JSONB NOT NULL,
    write_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ,
    synced BOOLEAN DEFAULT FALSE,
    user_id UUID
);
`

// FUTURE: Uncomment when implementing granular bullet sync
export const initializeExperienceBulletsChangelogQuery = `
-- CREATE TABLE IF NOT EXISTS experience_bullets_changes (
--     id BIGSERIAL PRIMARY KEY,
--     operation TEXT NOT NULL,
--     value JSONB NOT NULL,
--     write_id TEXT NOT NULL,
--     timestamp TIMESTAMPTZ,
--     synced BOOLEAN DEFAULT FALSE,
--     user_id UUID,
--     experience_id UUID
-- );
`

// =============================================================================
// PERSONAL DETAILS QUERIES
// =============================================================================

// Read Operations
export const getPersonalDetailsQuery = `
SELECT id, name, email, phone, location, linkedin, github, website, updated_at AS "updatedAt"
FROM personal_details
ORDER BY updated_at DESC
LIMIT 1
`

// Write Operations
export const upsertPersonalDetailsQuery = `
INSERT INTO personal_details (id, name, email, phone, location, linkedin, github, website, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz)
ON CONFLICT (id) DO UPDATE 
SET name=EXCLUDED.name, email=EXCLUDED.email, phone=EXCLUDED.phone, 
    location=EXCLUDED.location, linkedin=EXCLUDED.linkedin, github=EXCLUDED.github, 
    website=EXCLUDED.website, updated_at=EXCLUDED.updated_at
`

// Changelog Operations
export const insertPersonalDetailsChangelogQuery = `
INSERT INTO personal_details_changes (operation, value, write_id, timestamp, user_id)
VALUES ($1, $2, $3, $4, $5)
`

export const updatePersonalDetailChangelogQuery = `
UPDATE personal_details_changes SET synced = $1 WHERE write_id = $2
`

export const selectLatestUnsyncedPersonalDetailsChangeQuery = `
SELECT * FROM personal_details_changes
WHERE synced = FALSE AND operation = 'update'
AND user_id = $1
ORDER BY timestamp DESC LIMIT 1
`

export const markPreviousPersonalDetailsChangesAsSyncedQuery = `
UPDATE personal_details_changes SET synced = TRUE
WHERE synced = FALSE AND operation = 'update' 
AND timestamp <= $1 
AND user_id = $2
`

export const cleanUpSyncedChangelogEntriesQuery = `
DELETE FROM personal_details_changes 
WHERE synced = TRUE 
AND timestamp < NOW() - INTERVAL '3 days'
AND user_id = $1
`

export const transferAnonymousPersonalDetailsToUser = `
UPDATE personal_details_changes
SET user_id = $1
WHERE user_id IS NULL
`

// =============================================================================
// EXPERIENCE QUERIES
// =============================================================================

// Read Operations
export const getExperienceQuery = `
SELECT
    e.id, e.title, e.company_name, e.location, e.description,
    e.start_month, e.start_year, e.end_month, e.end_year,
    e.is_present, e.is_included, e.position,
    e.updated_at::text, e.created_at::text
FROM experience e
ORDER BY e.position ASC, e.created_at DESC
`

export const getExperienceBulletsQuery = `
SELECT 
    id, experience_id, text, is_locked, position,
    updated_at AS "updatedAt", created_at AS "createdAt"
FROM experience_bullets
WHERE experience_id = $1
ORDER BY position ASC
`

// Write Operations
export const upsertExperienceQuery = `
INSERT INTO experience (
    id, title, company_name, location, description,
    start_month, start_year, end_month, end_year,
    is_present, is_included, position, updated_at
) VALUES (
    $1, $2, $3, $4,
    CASE WHEN $5::text = 'undefined' THEN NULL ELSE $5 END,
    CASE WHEN $6::text = 'undefined' THEN NULL ELSE $6 END,
    $7::smallint,
    CASE WHEN $10 THEN NULL ELSE CASE WHEN $8::text = 'undefined' THEN NULL ELSE $8 END END,
    CASE WHEN $10 THEN NULL ELSE CASE WHEN $9 = '' THEN NULL ELSE $9::smallint END END,
    $10, $11, $12, $13::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    company_name = EXCLUDED.company_name,
    location = EXCLUDED.location,
    description = CASE WHEN EXCLUDED.description::text = 'undefined' THEN NULL ELSE EXCLUDED.description END,
    start_month = CASE WHEN EXCLUDED.start_month::text = 'undefined' THEN NULL ELSE EXCLUDED.start_month END,
    start_year = EXCLUDED.start_year,
    end_month = CASE WHEN EXCLUDED.is_present THEN NULL ELSE CASE WHEN EXCLUDED.end_month::text = 'undefined' THEN NULL ELSE EXCLUDED.end_month END END,
    end_year = CASE WHEN EXCLUDED.is_present THEN NULL ELSE EXCLUDED.end_year END,
    is_present = EXCLUDED.is_present,
    is_included = EXCLUDED.is_included,
    position = EXCLUDED.position,
    updated_at = EXCLUDED.updated_at
`

export const upsertExperienceBulletQuery = `
INSERT INTO experience_bullets (
    id, experience_id, text, is_locked, position, updated_at, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    is_locked = EXCLUDED.is_locked,
    position = EXCLUDED.position,
    updated_at = EXCLUDED.updated_at
`

export const deleteExperienceQuery = `
DELETE FROM experience WHERE id = $1
`

export const deleteExperienceBulletQuery = `
DELETE FROM experience_bullets WHERE id = $1
`

export const updateExperiencePositionQuery = `
UPDATE experience 
SET position = $2, updated_at = $3::timestamptz
WHERE id = $1
`

// Changelog Operations
export const insertExperienceChangelogQuery = `
INSERT INTO experience_changes (operation, value, write_id, timestamp, user_id)
VALUES ($1, $2, $3, $4, $5)
`

export const selectLatestUnsyncedExperienceChangeQuery = `
SELECT * FROM experience_changes
WHERE synced = FALSE AND operation = 'update'
AND user_id = $1
ORDER BY timestamp DESC LIMIT 1
`

export const markPreviousExperienceChangesAsSyncedQuery = `
UPDATE experience_changes SET synced = TRUE
WHERE synced = FALSE AND operation = 'update'
AND timestamp <= $1 AND user_id = $2
`

export const cleanUpSyncedExperienceChangelogEntriesQuery = `
DELETE FROM experience_changes
WHERE synced = TRUE
AND timestamp < NOW() - INTERVAL '3 days'
AND user_id = $1
`

export const transferAnonymousExperienceToUser = `
UPDATE experience_changes
SET user_id = $1
WHERE user_id IS NULL
`

// =============================================================================
// FUTURE: GRANULAR BULLET SYNC QUERIES (Currently Disabled)
// =============================================================================

// FUTURE: Uncomment when implementing granular bullet sync
// export const insertExperienceBulletsChangelogQuery = `
// INSERT INTO experience_bullets_changes (operation, value, write_id, timestamp, user_id, experience_id)
// VALUES ($1, $2, $3, $4, $5, $6)
// `

// export const selectLatestUnsyncedExperienceBulletsChangeQuery = `
// SELECT * FROM experience_bullets_changes
// WHERE synced = FALSE AND operation = 'update'
// AND user_id = $1
// ORDER BY timestamp DESC LIMIT 1
// `

// export const markPreviousExperienceBulletsChangesAsSyncedQuery = `
// UPDATE experience_bullets_changes SET synced = TRUE
// WHERE synced = FALSE AND operation = 'update'
// AND timestamp <= $1 AND user_id = $2
// `

// export const cleanUpSyncedExperienceBulletsChangelogEntriesQuery = `
// DELETE FROM experience_bullets_changes
// WHERE synced = TRUE
// AND timestamp < NOW() - INTERVAL '3 days'
// AND user_id = $1
// `

// export const transferAnonymousExperienceBulletsToUser = `
// UPDATE experience_bullets_changes
// SET user_id = $1
// WHERE user_id IS NULL
// `
