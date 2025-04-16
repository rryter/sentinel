class FileWithViolationsSummarySerializer < ActiveModel::Serializer
  attributes :id, :analysis_job_id, :file_path, :created_at, :updated_at
  
  # Instead of including all pattern matches, just include a count
  attribute :pattern_match_count
  
  def pattern_match_count
    # Use count instead of loading all pattern matches
    # This will generate a COUNT query instead of loading objects
    object.pattern_matches.count
  end
end 