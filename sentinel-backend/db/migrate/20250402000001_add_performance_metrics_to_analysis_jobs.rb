class AddPerformanceMetricsToAnalysisJobs < ActiveRecord::Migration[8.0]
  def change
    add_column :analysis_jobs, :files_processed, :integer, comment: "Number of files processed during analysis"
    add_column :analysis_jobs, :files_per_second_wall_time, :float, comment: "Files processed per second (wall time)"
    add_column :analysis_jobs, :cumulative_processing_time_ms, :integer, comment: "Cumulative processing time in milliseconds"
    add_column :analysis_jobs, :avg_time_per_file_ms, :float, comment: "Average time per file in milliseconds"
    add_column :analysis_jobs, :files_per_second_cpu_time, :float, comment: "Files processed per second (CPU time)"
    add_column :analysis_jobs, :parallel_cores_used, :integer, comment: "Number of CPU cores used in parallel processing"
    add_column :analysis_jobs, :parallel_speedup_factor, :float, comment: "Speedup factor from parallel processing"
    add_column :analysis_jobs, :parallel_efficiency_percent, :float, comment: "Efficiency of parallel processing in percent"
  end
end 