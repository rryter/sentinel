class AnalysisJob < ActiveRecord::Base
  belongs_to :project
  has_many :files_with_violations, class_name: "FileWithViolations", dependent: :destroy
  has_many :pattern_matches, through: :files_with_violations
  
  validates :status, presence: true
  # Define status as an enum for better querying
  enum :status, {
    pending: "pending",
    running: "running",
    completed: "completed", 
    failed: "failed"
  }, validate: true
end 