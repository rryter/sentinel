class FileWithViolations < ActiveRecord::Base
  # Explicitly set the table name since it doesn't follow the convention
  self.table_name = "files_with_violations"
  
  belongs_to :analysis_job
  has_many :pattern_matches, dependent: :destroy
  
  validates :file_path, presence: true
end 