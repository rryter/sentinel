class AddSeverityToPatternMatches < ActiveRecord::Migration[8.0]
  def up
    # Add severity_id column
    add_reference :pattern_matches, :severity, foreign_key: true
    
    # Migrate existing data - extract severity from metadata and map to Rust's severity levels
    execute <<-SQL
      -- Map existing severity values to the new values that match the Rust analyzer
      UPDATE pattern_matches 
      SET severity_id = (
        SELECT id FROM severities WHERE name = (
          CASE LOWER((metadata->>'severity')::text)
            WHEN 'critical' THEN 'error'
            WHEN 'high' THEN 'error'
            WHEN 'medium' THEN 'warning'
            WHEN 'low' THEN 'warning'
            WHEN 'info' THEN 'info'
            ELSE 'info'
          END
        )
      )
      WHERE metadata->>'severity' IS NOT NULL;
    SQL
    
    # For any records where severity couldn't be determined, set to 'info' by default
    execute <<-SQL
      UPDATE pattern_matches 
      SET severity_id = (SELECT id FROM severities WHERE name = 'info')
      WHERE severity_id IS NULL;
    SQL
  end
  
  def down
    # Before removing the column, store severity back in metadata
    execute <<-SQL
      UPDATE pattern_matches 
      SET metadata = metadata || 
        jsonb_build_object('severity', (
          SELECT name FROM severities WHERE id = pattern_matches.severity_id
        ))
      WHERE severity_id IS NOT NULL;
    SQL
    
    # Remove the column
    remove_reference :pattern_matches, :severity
  end
end 