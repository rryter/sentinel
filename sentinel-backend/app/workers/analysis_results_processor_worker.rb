class AnalysisResultsProcessorWorker
  include Sidekiq::Worker
  sidekiq_options retry: 3

  def perform(job_id)
    Rails.logger.info("AnalysisResultsProcessorWorker starting for job_id: #{job_id}")
    begin
      service = AnalysisService.new(job_id)
      job = AnalysisJob.find(job_id)
      
      if service.process_results(job)
        Rails.logger.info("AnalysisResultsProcessorWorker completed for job_id: #{job_id}")
      else
        Rails.logger.error("AnalysisResultsProcessorWorker failed to process results for job_id: #{job_id}")
      end
    rescue => e
      Rails.logger.error("AnalysisResultsProcessorWorker failed for job_id: #{job_id}: #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
      raise # Re-raise to let Sidekiq handle retries
    end
  end
end 