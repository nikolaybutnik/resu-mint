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
    user_id UUID,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

// Project tables
export const initializeProjectsQuery = `
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    link TEXT,
    technologies TEXT[],
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

export const initializeProjectBulletsQuery = `
CREATE TABLE IF NOT EXISTS project_bullets (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    user_id UUID,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`

export const initializeProjectChangelogQuery = `
CREATE TABLE IF NOT EXISTS project_changes (
    id BIGSERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    value JSONB NOT NULL,
    write_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ,
    synced BOOLEAN DEFAULT FALSE,
    user_id UUID
);
`

// Education Tables
export const initializeEducationQuery = `
CREATE TABLE IF NOT EXISTS education (
    id UUID PRIMARY KEY,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    degree_status TEXT,
    location TEXT,
    description TEXT,
    start_month TEXT CHECK (start_month IS NULL OR start_month = '' OR start_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    start_year SMALLINT CHECK (start_year IS NULL OR (start_year >= 1000 AND start_year <= 9999)),
    end_month TEXT CHECK (end_month IS NULL OR end_month = '' OR end_month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')),
    end_year SMALLINT CHECK (end_year IS NULL OR (end_year >= 1000 AND end_year <= 9999)),
    is_included BOOLEAN DEFAULT TRUE,
    position INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`

export const initializeEducationChangelogQuery = `
CREATE TABLE IF NOT EXISTS education_changes (
    id BIGSERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    value JSONB NOT NULL,
    write_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ,
    synced BOOLEAN DEFAULT FALSE,
    user_id UUID
);
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

export const cleanUpSyncedPersonalDetailsChangelogEntriesQuery = `
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
    e.updated_at::text, e.created_at::text,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', b.id,
                'text', b.text,
                'isLocked', b.is_locked,
                'position', b.position
            ) ORDER BY b.position ASC
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
    ) as bullet_points
FROM experience e
LEFT JOIN experience_bullets b ON e.id = b.experience_id
GROUP BY e.id, e.title, e.company_name, e.location, e.description,
    e.start_month, e.start_year, e.end_month, e.end_year,
    e.is_present, e.is_included, e.position, e.updated_at, e.created_at
ORDER BY e.position ASC, e.created_at DESC
`

export const getExperienceByIdQuery = `
SELECT
    e.id, e.title, e.company_name, e.location, e.description,
    e.start_month, e.start_year, e.end_month, e.end_year,
    e.is_present, e.is_included, e.position,
    e.updated_at::text, e.created_at::text,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', b.id,
                'text', b.text,
                'isLocked', b.is_locked,
                'position', b.position
            ) ORDER BY b.position ASC
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
    ) as bullet_points
FROM experience e
LEFT JOIN experience_bullets b ON e.id = b.experience_id
WHERE e.id = $1
GROUP BY e.id, e.title, e.company_name, e.location, e.description,
    e.start_month, e.start_year, e.end_month, e.end_year,
    e.is_present, e.is_included, e.position, e.updated_at, e.created_at
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
WITH bullet_operation AS (
    INSERT INTO experience_bullets (
        id, experience_id, text, is_locked, position, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET
        text = EXCLUDED.text,
        is_locked = EXCLUDED.is_locked,
        position = EXCLUDED.position,
        updated_at = EXCLUDED.updated_at
    RETURNING experience_id
)
UPDATE experience
SET updated_at = $6
WHERE id = $2
    AND EXISTS (SELECT 1 FROM bullet_operation WHERE experience_id = $2)
`

export const deleteExperienceQuery = `
DELETE FROM experience WHERE id = $1
`

export const deleteExperienceBulletQuery = `
DELETE FROM experience_bullets WHERE id = $1
`

export const deleteExperienceBulletsQuery = `
WITH deleted_bullets AS (
    DELETE FROM experience_bullets
    WHERE id = ANY($1)
    RETURNING experience_id
)
UPDATE experience
SET updated_at = $2
WHERE id IN (SELECT experience_id FROM deleted_bullets)
`

export const updateExperiencePositionQuery = `
UPDATE experience 
SET position = $2, updated_at = $3::timestamptz
WHERE id = $1
`

export const updateExperienceBulletPositionQuery = `
UPDATE experience_bullets 
SET position = $2, updated_at = $3::timestamptz
WHERE id = $1
`

export const reorderExperienceBulletsQuery = `
UPDATE experience_bullets 
SET position = subq.new_position - 1, updated_at = $2
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) AS new_position
    FROM experience_bullets 
    WHERE experience_id = $1
) AS subq
WHERE experience_bullets.id = subq.id
    AND experience_bullets.position != (subq.new_position - 1)
`

export const reorderExperiencePositionsQuery = `
UPDATE experience
SET position = subq.new_position - 1, updated_at = $1
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) AS new_position
    FROM experience
) AS subq
WHERE experience.id = subq.id
    AND experience.position != (subq.new_position - 1)
`

export const toggleExperienceBulletLockQuery = `
WITH bullet_lock AS (
    UPDATE experience_bullets
    SET is_locked = $1, updated_at = $2
    WHERE id = $3
    RETURNING experience_id
)
UPDATE experience
SET updated_at = $2
WHERE id IN (SELECT experience_id FROM bullet_lock)
`

export const toggleExperienceBulletsLockAllQuery = `
WITH bulk_lock AS (
    UPDATE experience_bullets
    SET is_locked = $1, updated_at = $2
    WHERE experience_id = $3
    RETURNING experience_id
)
UPDATE experience
SET updated_at = $2
WHERE id = $3
  AND EXISTS (SELECT 1 FROM bulk_lock WHERE experience_id = $3)
`

// Changelog Operations
export const insertExperienceChangelogQuery = `
INSERT INTO experience_changes (operation, value, write_id, timestamp, user_id)
VALUES ($1, $2, $3, $4, $5)
`

export const selectAllUnsyncedExperienceChangesQuery = `
SELECT * FROM experience_changes
WHERE synced = FALSE
AND user_id = $1
ORDER BY timestamp ASC
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

export const updateExperienceChangelogQuery = `
UPDATE experience_changes SET synced = $1 WHERE write_id = $2
`

// =============================================================================
// PROJECT QUERIES
// =============================================================================

// Read Operations
export const getProjectsQuery = `
SELECT
    p.id, p.title, p.link, p.technologies, p.description,
    p.start_month, p.start_year, p.end_month, p.end_year,
    p.is_present, p.is_included, p.position,
    p.updated_at::text, p.created_at::text,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', b.id,
                'text', b.text,
                'isLocked', b.is_locked,
                'position', b.position
            ) ORDER BY b.position ASC
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
    ) as bullet_points
FROM projects p
LEFT JOIN project_bullets b ON p.id = b.project_id
GROUP BY p.id, p.title, p.link, p.technologies, p.description,
    p.start_month, p.start_year, p.end_month, p.end_year,
    p.is_present, p.is_included, p.position, p.updated_at, p.created_at
ORDER BY p.position ASC, p.created_at DESC
`

export const getProjectByIdQuery = `
SELECT
    p.id, p.title, p.link, p.technologies, p.description,
    p.start_month, p.start_year, p.end_month, p.end_year,
    p.is_present, p.is_included, p.position,
    p.updated_at::text, p.created_at::text,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', b.id,
                'text', b.text,
                'isLocked', b.is_locked,
                'position', b.position
            ) ORDER BY b.position ASC
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
    ) as bullet_points
FROM projects p
LEFT JOIN project_bullets b ON p.id = b.project_id
WHERE p.id = $1
GROUP BY p.id, p.title, p.link, p.technologies, p.description,
    p.start_month, p.start_year, p.end_month, p.end_year,
    p.is_present, p.is_included, p.position, p.updated_at, p.created_at
`

export const getProjectBulletsQuery = `
SELECT 
    id, project_id, text, is_locked, position,
    updated_at AS "updatedAt", created_at AS "createdAt"
FROM project_bullets
WHERE project_id = $1
ORDER BY position ASC
`

// Write Operations
export const upsertProjectQuery = `
INSERT INTO projects (
    id, title, link, technologies, description,
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
    link = EXCLUDED.link,
    technologies = EXCLUDED.technologies,
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

export const upsertProjectBulletQuery = `
WITH bullet_operation AS (
    INSERT INTO project_bullets (
        id, project_id, text, is_locked, position, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET
        text = EXCLUDED.text,
        is_locked = EXCLUDED.is_locked,
        position = EXCLUDED.position,
        updated_at = EXCLUDED.updated_at
    RETURNING project_id
)
UPDATE projects
SET updated_at = $6
WHERE id = $2
  AND EXISTS (SELECT 1 FROM bullet_operation WHERE project_id = $2)
`

export const deleteProjectQuery = `
DELETE FROM projects WHERE id = $1
`

export const deleteProjectBulletQuery = `
DELETE FROM project_bullets WHERE id = $1
`

export const deleteProjectBulletsQuery = `
WITH deleted_bullets AS (
    DELETE FROM project_bullets
    WHERE id = ANY($1)
    RETURNING project_id
)
UPDATE projects
SET updated_at = $2
WHERE id IN (SELECT project_id FROM deleted_bullets)
`

export const updateProjectPositionQuery = `
UPDATE projects 
SET position = $2, updated_at = $3::timestamptz
WHERE id = $1
`

export const updateProjectBulletPositionQuery = `
UPDATE project_bullets 
SET position = $2, updated_at = $3::timestamptz
WHERE id = $1
`

export const reorderProjectBulletsQuery = `
UPDATE project_bullets 
SET position = subq.new_position - 1, updated_at = $2
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) AS new_position
    FROM project_bullets 
    WHERE project_id = $1
) AS subq
WHERE project_bullets.id = subq.id
    AND project_bullets.position != (subq.new_position - 1)
`

export const reorderProjectPositionsQuery = `
UPDATE projects
SET position = subq.new_position - 1, updated_at = $1
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) AS new_position
    FROM projects
) AS subq
WHERE projects.id = subq.id
    AND projects.position != (subq.new_position - 1)
`

export const toggleProjectBulletLockQuery = `
WITH bullet_lock AS (
    UPDATE project_bullets
    SET is_locked = $1, updated_at = $2
    WHERE id = $3
    RETURNING project_id
)
UPDATE projects
SET updated_at = $2
WHERE id IN (SELECT project_id FROM bullet_lock)
`

export const toggleProjectBulletsLockAllQuery = `
WITH bulk_lock AS (
    UPDATE project_bullets
    SET is_locked = $1, updated_at = $2
    WHERE project_id = $3
    RETURNING project_id
)
UPDATE projects
SET updated_at = $2
WHERE id = $3
    AND EXISTS (SELECT 1 FROM bulk_lock WHERE project_id = $3)
`

// Changelog Operations
export const insertProjectChangelogQuery = `
INSERT INTO project_changes (operation, value, write_id, timestamp, user_id)
VALUES ($1, $2, $3, $4, $5)
`

export const selectAllUnsyncedProjectChangesQuery = `
SELECT * FROM project_changes
WHERE synced = FALSE
AND user_id = $1
ORDER BY timestamp ASC
`

export const cleanUpSyncedProjectChangelogEntriesQuery = `
DELETE FROM project_changes
WHERE synced = TRUE
AND timestamp < NOW() - INTERVAL '3 days'
AND user_id = $1
`

export const transferAnonymousProjectToUser = `
UPDATE project_changes
SET user_id = $1
WHERE user_id IS NULL
`

export const updateProjectChangelogQuery = `
UPDATE project_changes SET synced = $1 WHERE write_id = $2
`

// =============================================================================
// EDUCATION QUERIES
// =============================================================================

// Read Operations
export const getEducationQuery = `
SELECT id, institution, degree, degree_status, location, description,
    start_month, start_year, end_month, end_year,
    is_included, position, updated_at::text, created_at::text
FROM education
ORDER BY position ASC, created_at DESC
`

export const getEducationByIdQuery = `
SELECT id, institution, degree, degree_status, location, description,
    start_month, start_year, end_month, end_year,
    is_included, position, updated_at::text, created_at::text
FROM education
WHERE id = $1
`

// Write Operations
export const upsertEducationQuery = `
INSERT INTO education (
    id, institution, degree, degree_status, location, description,
    start_month, start_year, end_month, end_year,
    is_included, position, updated_at
) VALUES (
    $1, $2, $3, $4,
    CASE WHEN $5::text = 'undefined' OR $5::text = '' THEN NULL ELSE $5 END,
    CASE WHEN $6::text = 'undefined' THEN NULL ELSE $6 END,
    CASE WHEN $7::text = 'undefined' OR $7::text = '' THEN NULL ELSE $7 END,
    CASE WHEN $8::text = '' THEN NULL ELSE $8::smallint END,
    CASE WHEN $9::text = 'undefined' OR $9::text = '' THEN NULL ELSE $9 END,
    CASE WHEN $10::text = '' THEN NULL ELSE $10::smallint END,
    $11, $12, $13::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
    institution = EXCLUDED.institution,
    degree = EXCLUDED.degree,
    degree_status = EXCLUDED.degree_status,
    location = EXCLUDED.location,
    description = CASE WHEN EXCLUDED.description::text = 'undefined' THEN NULL ELSE EXCLUDED.description END,
    start_month = CASE WHEN EXCLUDED.start_month::text = 'undefined' OR EXCLUDED.start_month::text = '' THEN NULL ELSE EXCLUDED.start_month END,
    start_year = EXCLUDED.start_year,
    end_month = CASE WHEN EXCLUDED.end_month::text = 'undefined' OR EXCLUDED.end_month::text = '' THEN NULL ELSE EXCLUDED.end_month END,
    end_year = EXCLUDED.end_year,
    is_included = EXCLUDED.is_included,
    position = EXCLUDED.position,
    updated_at = EXCLUDED.updated_at
`

export const deleteEducationQuery = `
DELETE FROM education WHERE id = $1
`

export const updateEducationPositionQuery = `
UPDATE education 
SET position = $2, updated_at = $3::timestamptz
WHERE id = $1
`

export const reorderEducationPositionsQuery = `
UPDATE education
SET position = subq.new_position - 1, updated_at = $1
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) AS new_position
    FROM education
) AS subq
WHERE education.id = subq.id
    AND education.position != (subq.new_position - 1)
`

// Changelog Operations
export const insertEducationChangelogQuery = `
INSERT INTO education_changes (operation, value, write_id, timestamp, user_id)
VALUES ($1, $2, $3, $4, $5)
`

export const selectAllUnsyncedEducationChangesQuery = `
SELECT * FROM education_changes
WHERE synced = FALSE
AND user_id = $1
ORDER BY timestamp ASC
`

export const cleanUpSyncedEducationChangelogEntriesQuery = `
DELETE FROM education_changes
WHERE synced = TRUE
AND timestamp < NOW() - INTERVAL '3 days'
AND user_id = $1
`

export const transferAnonymousEducationToUser = `
UPDATE education_changes
SET user_id = $1
WHERE user_id IS NULL
`

export const updateEducationChangelogQuery = `
UPDATE education_changes SET synced = $1 WHERE write_id = $2
`
