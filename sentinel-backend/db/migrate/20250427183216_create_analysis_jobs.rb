class CreateAnalysisJobs < ActiveRecord::Migration[8.0]
  def change
    create_table :analysis_jobs do |t|
      t.references :project, null: false, foreign_key: true
      t.string :status
      t.decimal :files_per_second_wall_time
      t.decimal :files_per_second_cpu_time
      t.decimal :avg_time_per_file_ms
      t.integer :cumulative_processing_time_ms
      t.integer :parallel_cores_used
      t.decimal :parallel_speedup_factor
      t.decimal :parallel_efficiency_percent
      t.integer :total_files
      t.integer :total_matches
      t.integer :rules_matched
      t.integer :duration
      t.datetime :completed_at

      t.timestamps
    end
  end
end
