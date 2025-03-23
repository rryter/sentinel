class AnalysisJob < ActiveRecord::Base
  belongs_to :project
  has_many :analysis_files, dependent: :destroy
  has_many :pattern_matches, through: :analysis_files
  
  validates :status, presence: true
  
  # Define status as an enum for better querying
  enum :status, {
    pending: "pending",
    running: "running",
    completed: "completed", 
    failed: "failed"
  }, validate: true
end 