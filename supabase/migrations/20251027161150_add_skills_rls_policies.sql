CREATE POLICY "Users can manage their resume_skills" ON resume_skills
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their skills" ON skills
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);