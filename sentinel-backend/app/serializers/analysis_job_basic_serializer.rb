class AnalysisJobBasicSerializer < ActiveModel::Serializer
  attributes :id, :status, :created_at, :updated_at, :project_id,
             :total_files, :total_matches, :rules_matched, :completed_at,
             :duration, :files_processed,
             :files_per_second_wall_time, :cumulative_processing_time_ms,
             :avg_time_per_file_ms, :files_per_second_cpu_time,
             :parallel_cores_used, :parallel_speedup_factor,
             :parallel_efficiency_percent
             
  # Cache the serializer
  cache key: 'analysis_job_basic', expires_in: 1.hour
end 