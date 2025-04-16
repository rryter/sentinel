class AnalysisJobStatisticsSerializer < ActiveModel::Serializer
  attributes :id, :rules_statistics
  
  # Cache the serializer for better performance
  cache key: 'analysis_job_statistics', expires_in: 1.hour

  def rules_statistics
    return {} unless object.id
    
    # Use a direct SQL query to get the counts by rule name without loading pattern matches
    counts = ActiveRecord::Base.connection.execute(<<-SQL
      SELECT rule_name, COUNT(*) as count
      FROM pattern_matches
      INNER JOIN files_with_violations ON pattern_matches.file_with_violations_id = files_with_violations.id
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