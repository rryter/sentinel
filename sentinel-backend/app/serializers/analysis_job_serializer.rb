class AnalysisJobSerializer < ActiveModel::Serializer
  attributes :id, :project_id, :status, :total_files, :processed_files, 
              :completed_at, :created_at, :updated_at, :go_job_id,
              :processing_status
  
  has_many :files_with_violations, class_name: "FileWithViolations"
  has_many :pattern_matches
  
  # Cache the serializer
  cache key: 'analysis_job', expires_in: 1.hour
  
  # Add a processing status for UI display
  def processing_status
    if object.status == 'completed'
      "#{object.processed_files || 0}/#{object.total_files || 0} files processed"
    elsif object.status == 'running'
      "Processing in progress"
    else
      "Waiting to start"
    end
  end
  
  # Include meta information about the job
  def meta
    {
      is_complete: object.status == 'completed',
      processing_time: object.completed_at.present? && object.created_at.present? ? 
                      (object.completed_at - object.created_at).round(2) : nil,
      created_on: object.created_at.strftime('%Y-%m-%d')
    }
  end
end 