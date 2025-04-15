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

  # Configure kaminari
  paginates_per 10

  def fetch_results
    # Call the analysis service to fetch and process results
    begin
      service = AnalysisService.new(id)
      service.process_results(self)
    rescue StandardError => e
      Rails.logger.error("Error fetching results for job #{id}: #{e.message}")
      update(error_message: "Failed to fetch results: #{e.message}")
      false
    end
  end
end