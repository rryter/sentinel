class InitialSchema < ActiveRecord::Migration[8.0]
  def change
    create_table :projects do |t|
      t.string :name, null: false
      t.string :repository_url
      t.timestamps
      t.index :name, unique: true
    end

    create_table :analysis_jobs do |t|
      t.references :project, null: false, foreign_key: true
      t.string :status, null: false, default: "pending"
      t.integer :total_files
      t.integer :processed_files
      t.datetime :completed_at
      t.string :go_job_id
      t.text :error_message
      t.integer :total_matches
      t.integer :rules_matched
      t.integer :files_processed, comment: "Number of files processed during analysis"
      t.float :files_per_second_wall_time, comment: "Files processed per second (wall time)"
      t.integer :cumulative_processing_time_ms, comment: "Cumulative processing time in milliseconds"
      t.float :avg_time_per_file_ms, comment: "Average time per file in milliseconds"
      t.float :files_per_second_cpu_time, comment: "Files processed per second (CPU time)"
      t.integer :parallel_cores_used, comment: "Number of CPU cores used in parallel processing"
      t.float :parallel_speedup_factor, comment: "Speedup factor from parallel processing"
      t.float :parallel_efficiency_percent, comment: "Efficiency of parallel processing in percent"
      t.bigint :duration, default: 0, null: false
      t.timestamps

      t.index :status
    end

    create_table :build_metrics do |t|
      t.bigint :timestamp, null: false
      t.boolean :is_initial_build, null: false
      t.string :machine_hostname, null: false
      t.string :machine_platform, null: false
      t.integer :machine_cpu_count, null: false
      t.bigint :machine_memory_total, null: false
      t.bigint :machine_memory_free, null: false
      t.string :process_node_version, null: false
      t.bigint :process_memory, null: false
      t.integer :build_files_count, null: false
      t.string :build_output_dir, null: false
      t.integer :build_error_count, null: false
      t.integer :build_warning_count, null: false
      t.text :build_entry_points, null: false, default: '[]'  # Store as JSON string
      t.json :build_file_types, null: false, default: '{}'
      t.string :workspace_name, null: false
      t.string :workspace_project, null: false
      t.string :workspace_environment, null: false
      t.string :workspace_user, null: false
      t.bigint :duration_ms, default: 0, null: false
      t.string :workspace_task
      t.timestamps

      t.index :timestamp
      t.index :workspace_environment
      t.index :workspace_project
    end

    create_table :severities do |t|
      t.string :name, null: false
      t.integer :level, null: false
      t.string :color_code
      t.text :description
      t.timestamps

      t.index :name, unique: true
      t.index :level, unique: true
    end

    create_table :files_with_violations do |t|
      t.references :analysis_job, null: false, foreign_key: true
      t.string :file_path, null: false
      t.timestamps

      t.index [:analysis_job_id, :file_path], unique: true
    end

    create_table :violations do |t|
      t.references :file_with_violations, null: false, foreign_key: true
      t.string :rule_id
      t.string :rule_name, null: false
      t.text :description
      t.integer :start_line, null: false
      t.integer :end_line, null: false
      t.integer :start_col
      t.integer :end_col
      t.json :metadata
      t.references :severity, foreign_key: true
      t.timestamps

      t.index :rule_id
      t.index :rule_name
    end

    # Insert default severities
    reversible do |dir|
      dir.up do
        execute <<-SQL
          INSERT INTO severities (name, level, created_at, updated_at)
          VALUES 
            ('error', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('warning', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('info', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        SQL
      end
    end
  end
end
