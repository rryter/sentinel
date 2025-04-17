class FileWithViolationsSummarySerializer < ActiveModel::Serializer
  attributes :id, :analysis_job_id, :file_path, :created_at, :updated_at
  
  # Instead of including all violations, just include a count
  attribute :violation_count
  
  def violation_count
    # Use count instead of loading all violations
    # This will generate a COUNT query instead of loading objects
    object.violations.count
  end
end 