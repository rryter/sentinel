class BuildMetric < ActiveRecord::Base
  # Validations
  validates :timestamp, presence: true
  validates :duration_ms, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :is_initial_build, inclusion: { in: [true, false] }
  validate :validate_raw_is_initial_build
  
  # Custom attribute accessor to track raw value
  # This accessor is used to temporarily store the raw input value for `is_initial_build`.
  # It allows validation of boolean-like strings (e.g., 'true', 'false', '1', '0') before
  # converting them into a proper boolean value for the `is_initial_build` attribute.
  attr_accessor :raw_is_initial_build
  
  # Machine metrics validations
  validates :machine_hostname, presence: true
  validates :machine_platform, presence: true
  validates :machine_cpu_count, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :machine_memory_total, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :machine_memory_free, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  
  # Process metrics validations
  validates :process_node_version, presence: true
  validates :process_memory, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  
  # Build metrics validations
  validates :build_files_count, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :build_output_dir, presence: true
  validates :build_error_count, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :build_warning_count, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  
  # Workspace info validations
  validates :workspace_name, presence: true
  validates :workspace_project, presence: true
  validates :workspace_environment, presence: true
  validates :workspace_user, presence: true

  # Scopes
  scope :with_errors, -> { where('build_error_count > 0') }
  scope :by_project, ->(project_name) { where(workspace_project: project_name) }
  scope :by_environment, ->(env_name) { where(workspace_environment: env_name) }
  
  # MySQL has native JSON type support for build_file_types

  # Methods
  # Converts the duration from milliseconds to seconds as a floating-point number.
  def duration_in_seconds
    return 0 if duration_ms.nil?
    (duration_ms.to_f / 1000).round(2)
  end

  # Calculates the percentage of memory used on the machine.
  # This is derived by subtracting the free memory from the total memory,
  # dividing the result by the total memory, and converting it to a percentage.
  # The result is rounded to two decimal places and represents the memory usage
  # as a percentage of the total available memory.
  def memory_usage_percent
    return 0 if machine_memory_total.nil? || machine_memory_total.zero?
    ((machine_memory_total - machine_memory_free).to_f / machine_memory_total * 100).round(2)
  end

  # Determines if the build was successful.
  # A build is considered successful if the `build_error_count` is zero.
  def successful?
    build_error_count.zero?
  end

  private

  def validate_raw_is_initial_build
    return unless raw_is_initial_build

    valid_boolean_strings = %w[true false 1 0]
    
    if raw_is_initial_build.is_a?(String)
      unless valid_boolean_strings.include?(raw_is_initial_build.downcase)
        errors.add(:is_initial_build, 'must be a valid boolean string (true, false, 1, 0)')
      end
    else
      unless [true, false].include?(raw_is_initial_build)
        errors.add(:is_initial_build, 'must be a boolean value')
      end
    end
  end
end