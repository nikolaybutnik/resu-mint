DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS resume_skills;

CREATE TABLE skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- one per user
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    hard_skills TEXT[] DEFAULT '{}',
    hard_suggestions TEXT[] DEFAULT '{}', -- to be implemented later
    soft_skills TEXT[] DEFAULT '{}',
    soft_suggestions TEXT[] DEFAULT '{}', -- to be implemented later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE resume_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    skills TEXT[] DEFAULT '{}',
    is_included BOOLEAN DEFAULT TRUE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);