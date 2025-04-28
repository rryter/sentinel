class AnalysisJobSummarySerializer < ActiveModel::Serializer
  attributes :id, :project_id, :status, :error_message, 
             :total_files, :completed_at, :created_at, :updated_at,
             :duration, :files_per_second_wall_time, 
             :cumulative_processing_time_ms, :avg_time_per_file_ms,
             :files_per_second_cpu_time, :parallel_cores_used,
             :parallel_speedup_factor, :parallel_efficiency_percent,
             :total_matches, :rules_matched
             
  # Include files_with_violations but not the violations
  has_many :files_with_violations, serializer: FileWithViolationsSummarySerializer
  
  # Add rule statistics without loading all violations
  attribute :rules_statistics
  
  def rules_statistics
    return {} unless object.id
    
    # Use a direct SQL query to get the counts by rule name without loading violations
    counts = ActiveRecord::Base.connection.execute(<<-SQL
      SELECT rule_name, COUNT(*) as count
      FROM violations
      INNER JOIN files_with_violations ON violations.file_with_violations_id = files_with_violations.id
      WHERE files_with_violations.analysis_job_id = #{object.id}
      GROUP BY rule_name
    SQL
    )
    
    # Convert to a hash
    counts.each_with_object({}) do |row, hash|
      hash[row['rule_name']] = row['count']
    end
  end
end 