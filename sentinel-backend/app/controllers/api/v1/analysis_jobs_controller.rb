module Api
  module V1
    class AnalysisJobsController < ApplicationController
      before_action :set_job, only: [:show]
      
      def index
        @jobs = AnalysisJob.includes(:files_with_violations, :pattern_matches)
          .order(created_at: :desc)
          .page(params[:page])
          .per(params[:per_page])
        
        render json: {
          data: ActiveModelSerializers::SerializableResource.new(@jobs, each_serializer: AnalysisJobSerializer, adapter: :attributes).as_json,
          meta: {
            current_page: @jobs.current_page,
            total_pages: @jobs.total_pages,
            total_count: @jobs.total_count
          }
        }
      end
      
      def show
        # Preload associations to avoid N+1 queries
        @job = AnalysisJob.includes(
          files_with_violations: {},
          pattern_matches: { file_with_violations: {} }
        ).find(params[:id])
        
        render json: {
          data: ActiveModelSerializers::SerializableResource.new(@job, adapter: :attributes).as_json
        }
      end
      
      def create
        project_id = params[:project_id] || params.dig(:api_v1_analysis_jobs_post_request, :project_id)
        @project = Project.find_by(id: project_id)

        if @project.nil?
          render json: { errors: { project_id: ['is invalid'] } }, status: :unprocessable_entity
          return
        end

        @job = @project.analysis_jobs.new(status: 'pending')
        
        if @job.save
          # Only perform these operations in non-test environments
          unless Rails.env.test?
            AnalysisWorker.perform_async(@job.id, @project.id)
            AnalysisStatusPollerWorker.perform_in(1.seconds, @job.id)
            Rails.logger.info("Queued AnalysisWorker and AnalysisStatusPollerWorker for job_id: #{@job.id}")
          end
          
          render json: {
            data: ActiveModelSerializers::SerializableResource.new(@job, adapter: :attributes).as_json
          }, status: :created
        else
          render json: { errors: @job.errors }, status: :unprocessable_entity
        end
      end
      
      # Add the fetch_results action
      def fetch_results
        @job = AnalysisJob.find(params[:id])
        
        begin
          if @job.fetch_results
            render json: {
              data: ActiveModelSerializers::SerializableResource.new(@job, adapter: :attributes).as_json
            }
          else
            render json: { error: 'Failed to fetch analysis results' }, status: :service_unavailable
          end
        rescue StandardError => e
          render json: { error: 'Failed to fetch analysis results' }, status: :service_unavailable
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Analysis job not found' }, status: :not_found
      end
      
      # Add the process_results action
      def process_results
        @job = AnalysisJob.find(params[:id])
        ProcessAnalysisResultsJob.perform_later(@job.id)
        render json: { message: 'Analysis results processing has been scheduled' }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Analysis job not found' }, status: :not_found
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