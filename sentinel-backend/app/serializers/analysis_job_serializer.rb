class AnalysisJobSerializer < ActiveModel::Serializer
  attributes :id, :status, :created_at, :updated_at, :project_id,
             :total_files, :total_matches, :rules_matched, :completed_at,
             :duration, :files_processed,
             :files_per_second_wall_time, :cumulative_processing_time_ms,
             :avg_time_per_file_ms, :files_per_second_cpu_time,
             :parallel_cores_used, :parallel_speedup_factor,
             :parallel_efficiency_percent, :processing_duration

  has_one :project

  # Cache the serializer
  cache key: 'analysis_job', expires_in: 1.hour

  # Use JSON adapter by default
  def self.adapter
    ActiveModelSerializers::Adapter::Json
  end

  # Configure pagination
  def self.paginate(collection, page, per_page)
    collection.page(page).per(per_page)
  end

  # Calculate processing duration in seconds
  def processing_duration
    return nil unless object.completed_at
    (object.completed_at - object.created_at).to_i
  end
end
