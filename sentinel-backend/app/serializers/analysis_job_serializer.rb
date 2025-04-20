class AnalysisJobSerializer < ActiveModel::Serializer
  # Basic information
  attributes :id, :project_id, :status
  
  # Timing information
  attributes :created_at, :updated_at, :duration
  
  # Result counts
  attributes :total_files, :total_matches, :rules_matched
  
  # Performance metrics
  attributes :files_per_second_wall_time, :files_per_second_cpu_time,
             :avg_time_per_file_ms, :cumulative_processing_time_ms
             
  # Parallelization metrics
  attributes :parallel_cores_used, :parallel_speedup_factor, :parallel_efficiency_percent

  # Related entities
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

  # Default values for required fields
  def total_files
    object.total_files || 0
  end
  
  def total_matches
    object.total_matches || 0
  end
  
  def rules_matched
    object.rules_matched || 0
  end
  
  def duration
    object.duration || 0
  end
  
  def files_per_second_wall_time
    object.files_per_second_wall_time || 0.0
  end
  
  def cumulative_processing_time_ms
    object.cumulative_processing_time_ms || 0
  end
  
  def avg_time_per_file_ms
    object.avg_time_per_file_ms || 0.0
  end
  
  def files_per_second_cpu_time
    object.files_per_second_cpu_time || 0.0
  end
  
  def parallel_cores_used
    object.parallel_cores_used || 1
  end
  
  def parallel_speedup_factor
    object.parallel_speedup_factor || 1.0
  end
  
  def parallel_efficiency_percent
    object.parallel_efficiency_percent || 100.0
  end
end
