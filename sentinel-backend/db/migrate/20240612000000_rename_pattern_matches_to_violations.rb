class RenamePatternMatchesToViolations < ActiveRecord::Migration[8.0]
  def up
    # Rename the table
    rename_table :pattern_matches, :violations

    # Instead of renaming indices, which is causing issues with PostgreSQL,
    # we'll recreate them with the correct names
    
    # Check if indices exist before attempting to recreate them
    if index_exists?(:violations, :rule_id)
      remove_index :violations, :rule_id
      add_index :violations, :rule_id, name: 'index_violations_on_rule_id'
    end
    
    if index_exists?(:violations, :rule_name)
      remove_index :violations, :rule_name
      add_index :violations, :rule_name, name: 'index_violations_on_rule_name'
    end
    
    if index_exists?(:violations, :severity_id)
      remove_index :violations, :severity_id
      add_index :violations, :severity_id, name: 'index_violations_on_severity_id'
    end
    
    if index_exists?(:violations, :file_with_violations_id)
      remove_index :violations, :file_with_violations_id
      add_index :violations, :file_with_violations_id, name: 'index_violations_on_file_with_violations_id'
    end
  end

  def down
    # First recreate the original indices
    if index_exists?(:violations, :rule_id, name: 'index_violations_on_rule_id')
      remove_index :violations, name: 'index_violations_on_rule_id' 
      add_index :violations, :rule_id, name: 'index_pattern_matches_on_rule_id'
    end
    
    if index_exists?(:violations, :rule_name, name: 'index_violations_on_rule_name')
      remove_index :violations, name: 'index_violations_on_rule_name'
      add_index :violations, :rule_name, name: 'index_pattern_matches_on_rule_name'
    end
    
    if index_exists?(:violations, :severity_id, name: 'index_violations_on_severity_id')
      remove_index :violations, name: 'index_violations_on_severity_id'
      add_index :violations, :severity_id, name: 'index_pattern_matches_on_severity_id'
    end
    
    if index_exists?(:violations, :file_with_violations_id, name: 'index_violations_on_file_with_violations_id')
      remove_index :violations, name: 'index_violations_on_file_with_violations_id'
      add_index :violations, :file_with_violations_id, name: 'index_pattern_matches_on_file_with_violations_id'
    end

    # Revert table rename
    rename_table :violations, :pattern_matches
  end
end 