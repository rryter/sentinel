class CreateIndexesForFilesWithViolations < ActiveRecord::Migration[8.0]
  def up
    # Add indexes for files_with_violations table if they don't exist
    unless index_exists?(:files_with_violations, :analysis_job_id, name: 'index_files_with_violations_on_analysis_job_id')
      add_index :files_with_violations, :analysis_job_id, name: 'index_files_with_violations_on_analysis_job_id'
    end
    
    unless index_exists?(:files_with_violations, [:analysis_job_id, :file_path], name: 'index_files_with_violations_on_analysis_job_id_and_file_path')
      add_index :files_with_violations, [:analysis_job_id, :file_path], name: 'index_files_with_violations_on_analysis_job_id_and_file_path', unique: true
    end
    
    # Add index for pattern_matches on file_with_violations_id if it doesn't exist
    unless index_exists?(:pattern_matches, :file_with_violations_id, name: 'index_pattern_matches_on_file_with_violations_id')
      add_index :pattern_matches, :file_with_violations_id, name: 'index_pattern_matches_on_file_with_violations_id'
    end

    # Check if old index exists and remove it
    if index_exists?(:pattern_matches, :analysis_file_id)
      remove_index :pattern_matches, :analysis_file_id
    end
  end

  def down
    # Only remove indexes if they exist
    if index_exists?(:files_with_violations, [:analysis_job_id, :file_path], name: 'index_files_with_violations_on_analysis_job_id_and_file_path')
      remove_index :files_with_violations, name: 'index_files_with_violations_on_analysis_job_id_and_file_path'
    end
    
    if index_exists?(:files_with_violations, :analysis_job_id, name: 'index_files_with_violations_on_analysis_job_id')
      remove_index :files_with_violations, name: 'index_files_with_violations_on_analysis_job_id'
    end
    
    if index_exists?(:pattern_matches, :file_with_violations_id, name: 'index_pattern_matches_on_file_with_violations_id')
      remove_index :pattern_matches, name: 'index_pattern_matches_on_file_with_violations_id'
    end
    
    # Add back the old index for pattern_matches
    unless index_exists?(:pattern_matches, :analysis_file_id, name: 'index_pattern_matches_on_analysis_file_id')
      add_index :pattern_matches, :analysis_file_id, name: 'index_pattern_matches_on_analysis_file_id'
    end
  end
end
