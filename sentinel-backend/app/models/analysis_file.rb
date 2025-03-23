class AnalysisFile < ActiveRecord::Base
  belongs_to :analysis_job
  has_many :pattern_matches, dependent: :destroy
  
  validates :file_path, presence: true
end 