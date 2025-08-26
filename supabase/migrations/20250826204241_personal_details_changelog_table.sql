CREATE TABLE personal_details_changes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    operation TEXT NOT NULL,  
    value JSONB NOT NULL,    
    write_id TEXT NOT NULL,   
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE personal_details_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own personal_details_changes"
    ON personal_details_changes
    FOR ALL USING (auth.uid() = user_id);
