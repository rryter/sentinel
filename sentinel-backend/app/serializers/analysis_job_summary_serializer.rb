class AnalysisJobSummarySerializer < ActiveModel::Serializer
  attributes :id, :project_id, :status,
             :total_files, :completed_at, :created_at, :updated_at,
             :duration, :files_per_second_wall_time,
             :cumulative_processing_time_ms, :avg_time_per_file_ms,
             :files_per_second_cpu_time, :parallel_cores_used,
             :parallel_speedup_factor, :parallel_efficiency_percent,
             :total_matches, :rules_matched

  # Optional error_message attribute (only if column exists)
  attribute :error_message, if: :has_error_message?

  # Related entities
  has_one :project

  def has_error_message?
    object.respond_to?(:error_message)
  end
             
  # Include files_with_violations but not the violations
  has_many :files_with_violations, serializer: FileWithViolationsSummarySerializer
  
  # Add rule statistics without loading all violations
  attribute :rules_statistics
  
  def rules_statistics
    return [] unless object.id

    # Use ActiveRecord to get the counts by rule name
    counts = Violation
      .joins(:file_with_violations)
      .where(files_with_violations: { analysis_job_id: object.id })
      .group(:rule_name)
      .count

    # Convert to array of hashes and sort by count descending
    counts.map { |rule, count| { rule: rule, count: count } }
          .sort_by { |item| -item[:count] }
  end
end 