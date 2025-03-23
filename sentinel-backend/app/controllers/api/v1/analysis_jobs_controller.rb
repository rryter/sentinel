module Api
  module V1
    class AnalysisJobsController < ApplicationController
      before_action :set_job, only: [:show]
      
      def index
        @jobs = AnalysisJob.all
        render json: @jobs
      end
      
      def show
        render json: @job
      end
      
      def create
        @project = Project.find_by!(id: params[:project_id])
        @job = @project.analysis_jobs.new(status: 'pending')
        
        if @job.save
          # Start the analysis worker immediately
          AnalysisWorker.perform_async(@job.id, @project.id)
          
          # Schedule the status poller with a shorter initial delay
          # This helps reduce overall analysis time - pass timestamp instead of Time object
          AnalysisStatusPollerWorker.perform_in(1.seconds, @job.id)
          
          Rails.logger.info("Queued AnalysisWorker and AnalysisStatusPollerWorker for job_id: #{@job.id}")
          
          render json: @job, status: :created
        else
          render json: { errors: @job.errors }, status: :unprocessable_entity
        end
      end
      
      # Add the fetch_results action
      def fetch_results
        @job = AnalysisJob.find(params[:id])
        service = AnalysisService.new(@job.id)
        
        # Try to get cached data first
        data = service.fetch_patterns
        
        if data
          render json: data
        else
          render json: { error: 'Failed to fetch analysis results' }, status: :service_unavailable
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Analysis job not found' }, status: :not_found
      rescue => e
        Rails.logger.error("Error in fetch_results: #{e.message}")
        render json: { error: "Internal server error: #{e.message}" }, status: :internal_server_error
      end
      
      # Add the process_results action
      def process_results
        @job = AnalysisJob.find(params[:id])
        
        # Queue a worker to process results asynchronously rather than doing it in the controller
        AnalysisResultsProcessorWorker.perform_async(@job.id)
        
        render json: { message: 'Analysis results processing has been scheduled' }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Analysis job not found' }, status: :not_found
      rescue => e
        Rails.logger.error("Error in process_results: #{e.message}")
        render json: { error: "Internal server error: #{e.message}" }, status: :internal_server_error
      end
      
      private
      
      def set_job
        @job = AnalysisJob.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Analysis job not found' }, status: :not_found
      end
    end
  end
end 