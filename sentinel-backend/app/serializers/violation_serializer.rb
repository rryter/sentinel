class ViolationSerializer < ActiveModel::Serializer
  attributes :id, :start_line, :end_line, :start_col, :end_col,
             :file_with_violations_id, :rule_id, :rule_name, :description,
             :line_number, :pattern_name, :location, :metadata_content, :code_snippet

  # Include the association for API compatibility, but it will use the preloaded data
  belongs_to :file_with_violations, class_name: "FileWithViolations"

  # Cache the serializer
  cache key: 'violation', expires_in: 1.hour

  # Line number is an alias for start_line
  def line_number
    object.start_line
  end

  # Extract pattern name - it's already in rule_name column
  def pattern_name
    object.rule_name
  end

  # Format location for easy display
  def location
    object.location_range
  end

  # Serialize metadata JSON
  def metadata_content
    object.metadata.presence || {}
  end

  # Get the source code snippet if available in metadata
  def code_snippet
    if object.metadata.present? && object.metadata["code_snippet"].present?
      object.metadata["code_snippet"]
    else
      nil
    end
  end
end