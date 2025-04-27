class CreateBuildMetrics < ActiveRecord::Migration[8.0]
  def change
    create_table :build_metrics do |t|
      t.datetime :timestamp, null: false
      t.integer :duration_ms, null: false
      t.boolean :is_initial_build, null: false, default: false
      
      # Machine metrics
      t.string :machine_hostname, null: false
      t.string :machine_platform, null: false
      t.integer :machine_cpu_count, null: false
      t.integer :machine_memory_total, null: false
      t.integer :machine_memory_free, null: false
      
      # Process metrics
      t.string :process_node_version, null: false
      t.integer :process_memory, null: false
      
      # Build metrics
      t.integer :build_files_count, null: false
      t.string :build_output_dir, null: false
      t.integer :build_error_count, null: false, default: 0
      t.integer :build_warning_count, null: false, default: 0
      
      # Workspace info
      t.string :workspace_name, null: false
      t.string :workspace_project, null: false
      t.string :workspace_environment, null: false
      t.string :workspace_user, null: false

      t.timestamps
    end

    add_index :build_metrics, :timestamp
    add_index :build_metrics, :workspace_project
    add_index :build_metrics, :workspace_environment
  end
end
