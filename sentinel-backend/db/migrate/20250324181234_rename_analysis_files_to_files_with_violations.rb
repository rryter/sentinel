class RenameAnalysisFilesToFilesWithViolations < ActiveRecord::Migration[8.0]
  def up
    # Rename the table
    rename_table :analysis_files, :files_with_violations
    
    # Update the foreign key reference in pattern_matches
    rename_column :pattern_matches, :analysis_file_id, :file_with_violations_id
  end

  def down
    # Revert the foreign key reference in pattern_matches
    rename_column :pattern_matches, :file_with_violations_id, :analysis_file_id
    
    # Revert the table name
    rename_table :files_with_violations, :analysis_files
  end
end
