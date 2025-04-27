class AddMissingConstraintsAndViolations < ActiveRecord::Migration[8.0]
  def change
    # First create the files_with_violations table without foreign key
    unless table_exists?(:files_with_violations)
      create_table :files_with_violations do |t|
        t.bigint :analysis_job_id, null: false
        t.string :file_path, null: false
        t.timestamps
      end
      add_index :files_with_violations, [:analysis_job_id, :file_path], unique: true
    end

    # Create violations table without foreign keys if it doesn't exist
    unless table_exists?(:violations)
      create_table :violations do |t|
      t.bigint :file_with_violations_id, null: false
      t.bigint :severity_id
      t.string :rule_id
      t.string :rule_name, null: false
      t.text :description
      t.integer :start_line, null: false
      t.integer :end_line, null: false
      t.integer :start_col
      t.integer :end_col
      t.text :metadata_content
      t.text :code_snippet
      t.string :pattern_name

        t.timestamps
      end
    end

    # Add indexes if they don't exist
    add_index :violations, [:file_with_violations_id, :rule_name, :start_line, :end_line], 
              name: 'index_violations_on_file_rule_and_location',
              unique: true,
              if_not_exists: true
    
    # Now add all foreign key constraints with explicit column names
    add_foreign_key :files_with_violations, :analysis_jobs, 
                    column: :analysis_job_id unless foreign_key_exists?(:files_with_violations, :analysis_jobs)
    add_foreign_key :violations, :files_with_violations,
                    column: :file_with_violations_id unless foreign_key_exists?(:violations, :files_with_violations)
    add_foreign_key :violations, :severities,
                    column: :severity_id unless foreign_key_exists?(:violations, :severities)

    # Add missing constraints to projects
    change_column_null :projects, :name, false
    add_index :projects, :name, unique: true, if_not_exists: true

    # Add missing constraints to analysis_jobs
    change_column_null :analysis_jobs, :status, false
    change_column_default :analysis_jobs, :status, "pending"
    add_index :analysis_jobs, :status, if_not_exists: true

    # Add missing constraints to severities
    change_column_null :severities, :name, false
    change_column_null :severities, :level, false
    add_index :severities, :name, unique: true, if_not_exists: true
    add_index :severities, :level, unique: true, if_not_exists: true
  end
end
