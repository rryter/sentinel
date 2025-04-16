class PatternMatch < ActiveRecord::Base
  belongs_to :file_with_violations, class_name: "FileWithViolations"
  belongs_to :severity, optional: true
  
  validates :rule_name, presence: true
  validates :start_line, presence: true
  validates :end_line, presence: true
  
  def location_range
    "#{start_line}:#{start_col}-#{end_line}:#{end_col}"
  end
  
  # Set severity by name, mapping legacy severity names if needed
  def set_severity_by_name(severity_name)
    return unless severity_name.present?
    
    # Map the severity name to our supported values
    mapped_severity = Severity.map_legacy_severity(severity_name)
    
    # Find the severity record
    self.severity = Severity.find_by_name_ignore_case(mapped_severity) || Severity.default
  end
  
  # Get the severity as a string (for API responses)
  def severity_name
    severity&.name || 'info'
  end
  
  # Is this a high-priority issue?
  def high_priority?
    severity&.high_priority? || false
  end
end 