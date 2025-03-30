class AnalysisJobSerializer < ActiveModel::Serializer
  attributes :id, :status, :created_at, :updated_at, :project_id
  
  has_many :files_with_violations, class_name: "FileWithViolations"
  has_many :pattern_matches
  
  # Cache the serializer
  cache key: 'analysis_job', expires_in: 1.hour
  
  # Use JSON adapter by default
  def self.adapter
    ActiveModelSerializers::Adapter::Json
  end
  
  # Configure pagination
  def self.paginate(collection, page, per_page)
    collection.page(page).per(per_page)
  end
end 