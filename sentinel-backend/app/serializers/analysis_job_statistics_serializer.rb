class AnalysisJobStatisticsSerializer < ActiveModel::Serializer
  attributes :id, :rules_statistics
  
  # Cache the serializer for better performance
  cache key: 'analysis_job_statistics', expires_in: 1.hour

  def rules_statistics
    return [] unless object.id

    # Use a direct SQL query to get the counts by rule name without loading violations
    counts = ActiveRecord::Base.connection.execute(<<-SQL
      SELECT rule_name, COUNT(*) as count
      FROM violations
      INNER JOIN files_with_violations ON violations.file_with_violations_id = files_with_violations.id
      WHERE files_with_violations.analysis_job_id = #{object.id}
      GROUP BY rule_name
      ORDER BY count DESC
    SQL
    )

    # Convert to an array of hashes sorted by count descending
    counts.map do |row|
      { rule: row['rule_name'], count: row['count'] }
    end
  end
end 