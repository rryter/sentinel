class AnalysisJobSerializer < ActiveModel::Serializer
  attributes :id, :status, :created_at, :updated_at
  
  has_many :files_with_violations, class_name: "FileWithViolations"
  has_many :pattern_matches
  
  # Cache the serializer
  cache key: 'analysis_job', expires_in: 1.hour
end 