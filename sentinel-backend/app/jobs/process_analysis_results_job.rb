class ProcessAnalysisResultsJob < ApplicationJob
  queue_as :default

  def perform(analysis_job_id)
    analysis_job = AnalysisJob.find(analysis_job_id)
    # Process the results here
    # For now, this is just a placeholder
  end
end 