class BuildMetric < ActiveRecord::Base
  # Validations
  validates :timestamp, presence: true
  validates :duration, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :is_initial_build, inclusion: { in: [true, false] }
  
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
  scope :recent, -> { order(timestamp: :desc) }
  scope :by_project, ->(project_name) { where(workspace_project: project_name) }
  scope :by_environment, ->(env_name) { where(workspace_environment: env_name) }
  scope :with_errors, -> { where('build_error_count > 0') }
  
  # Methods
  def duration_in_seconds
    duration / 1000.0
  end

  def memory_usage_percentage
    return 0 if machine_memory_total.zero?
    ((machine_memory_total - machine_memory_free).to_f / machine_memory_total * 100).round(2)
  end

  def successful?
    build_error_count.zero?
  end
end 