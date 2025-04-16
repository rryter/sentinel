class Severity < ActiveRecord::Base
  has_many :pattern_matches
  
  validates :name, presence: true, uniqueness: true
  validates :level, presence: true, uniqueness: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  
  # Constants for severity levels to match Rust code
  ERROR = 'error'.freeze
  WARNING = 'warning'.freeze
  INFO = 'info'.freeze
  OFF = 'off'.freeze
  
  # Find severity by name, case-insensitive
  def self.find_by_name_ignore_case(name)
    where("LOWER(name) = LOWER(?)", name).first
  end
  
  # Default severity (info)
  def self.default
    find_by(name: INFO)
  end
  
  # Map legacy severity to Rust severity levels
  def self.map_legacy_severity(severity_name)
    return INFO unless severity_name.present?
    
    case severity_name.to_s.downcase
    when 'critical', 'high'
      ERROR
    when 'medium', 'low', 'warning', 'warn'
      WARNING
    when 'info'
      INFO
    when 'off', 'none'
      OFF
    else
      INFO
    end
  end
  
  # Is this a high-priority severity level?
  def high_priority?
    name == ERROR
  end
  
  # Is this a medium-priority severity level?
  def medium_priority?
    name == WARNING
  end
  
  # Is this a low-priority severity level?
  def low_priority?
    name == INFO
  end
  
  # Is this severity disabled?
  def disabled?
    name == OFF
  end
end 