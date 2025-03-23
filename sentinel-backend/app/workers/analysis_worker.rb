class AnalysisWorker
  include Sidekiq::Worker
  sidekiq_options retry: 3
  
  def perform(job_id, project_id)
    Rails.logger.info("AnalysisWorker starting for job_id: #{job_id}, project_id: #{project_id}")
    begin
      service = AnalysisService.new(job_id)
      result = service.start_analysis(project_id)
      
      if result
        Rails.logger.info("AnalysisWorker completed for job_id: #{job_id}")
      else
        Rails.logger.error("AnalysisWorker failed to start analysis for job_id: #{job_id}")
      end
    rescue => e
      Rails.logger.error("AnalysisWorker failed for job_id: #{job_id}: #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
      raise # Re-raise to let Sidekiq handle retries
    end
  end
end 