class FileWithViolationsSerializer < ActiveModel::Serializer
  attributes :id, :file_path, :analysis_job_id, :display_path, :job_status
  
  belongs_to :analysis_job
  has_many :violations do
    if scope && scope[:rule_name].present?
      rule_names = scope[:rule_name].split(',').map(&:strip)
      object.violations.where(rule_name: rule_names)
    else
      object.violations
    end
  end
  
  # Cache the serializer
  cache key: 'file_with_violations', expires_in: 1.hour
  
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