class AnalysisStatusPollerWorker
  include Sidekiq::Worker
  sidekiq_options retry: 3
  
  def perform(job_id)
    job = AnalysisJob.find_by(id: job_id)
    return unless job && job.status == 'running'
    
    # If the job doesn't have a Go job ID yet, give it more time
    if job.go_job_id.blank?
      Rails.logger.info("Job #{job_id} doesn't have a Go job ID yet, will retry in 10 seconds")
      self.class.perform_in(10.seconds, job_id)
      return
    end
    
    Rails.logger.info("Polling for status update for job_id: #{job_id}, go_job_id: #{job.go_job_id}")
    
    # Create service to interact with Go API
    service = AnalysisService.new(job_id)
    
    # Poll Go service for status
    begin
      status_result = service.check_status
      
      if status_result
        status = status_result['status']
        
        Rails.logger.info("Got status update for job_id: #{job_id}: #{status}")
        
        # Update job in database
        if status == 'completed'
          begin
            # Process results when job completes
            Rails.logger.info("Job #{job_id} completed, processing results")
            result = service.process_results(job)
          rescue => e
            Rails.logger.error("Error processing results for job #{job_id}: #{e.message}")
            Rails.logger.error(e.backtrace.join("\n"))
            job.update!(status: 'failed', error_message: "Error processing results: #{e.message}")
          end
        elsif status == 'failed'
          job.update!(status: 'failed', error_message: status_result['error'] || 'Unknown error')
        else
          # Requeue this job to check again in 10 seconds
          self.class.perform_in(1.seconds, job_id)
        end
      else
        Rails.logger.error("Failed to get status from Go service for job_id: #{job_id}")
        # Requeue to try again
        self.class.perform_in(30.seconds, job_id)
      end
    rescue => e
      Rails.logger.error("Error polling job status: #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
      # Requeue to try again
      self.class.perform_in(30.seconds, job_id)
    end
  end
end 