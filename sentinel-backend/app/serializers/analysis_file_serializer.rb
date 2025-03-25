class AnalysisFileSerializer < ActiveModel::Serializer
  attributes :id, :file_path, :files_with_violations, :display_path, :job_status
  
  belongs_to :analysis_job
  has_many :pattern_matches
  
  # Cache the serializer
  cache key: 'files_with_violations', expires_in: 1.hour
  
  # Format the file path for easier viewing
  def display_path
    path = object.file_path.to_s
    if path.present? && path.length > 50
      "...#{path.last(47)}"
    else
      path
    end
  end
  
  # Include job status from parent relationship
  def job_status
    object.analysis_job&.status
  end
end 