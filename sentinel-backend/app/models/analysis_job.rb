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

  # Scope to include files with violations and their counts
  scope :with_files_and_counts, -> {
    includes(:files_with_violations)
    .joins('LEFT JOIN (
        SELECT file_with_violations_id, COUNT(*) as match_count
        FROM pattern_matches
        GROUP BY file_with_violations_id
      ) counts ON files_with_violations.id = counts.file_with_violations_id')
    .select('analysis_jobs.*, COALESCE(counts.match_count, 0) as match_count')
  }

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