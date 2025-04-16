module Api
  module V1
    class AnalysisJobsController < ApplicationController
      before_action :set_job, only: [:show, :fetch_results]

      def index
        @jobs = AnalysisJob
          .order(created_at: :desc)
          .page(params[:page])
          .per(params[:per_page])

        render json: {
          data: ActiveModelSerializers::SerializableResource.new(
            @jobs, 
            each_serializer: AnalysisJobSerializer, 
            adapter: :attributes,
            # Don't include files in the list view for performance
            include_files: false,
            include_statistics: false
          ).as_json,
          meta: {
            current_page: @jobs.current_page,
            total_pages: @jobs.total_pages,
            total_count: @jobs.total_count
          }
        }
      end

      def show
        @job = AnalysisJob.find(params[:id])

        render json: {
          data: ActiveModelSerializers::SerializableResource.new(
            @job,
            adapter: :attributes,
            serializer: AnalysisJobSerializer
          ).as_json
        }
      end

      def create
        project_id = params[:project_id] || params.dig(:api_v1_analysis_jobs_post_request, :project_id)
        @project = Project.find_by(id: project_id)

        if @project.nil?
          render json: { errors: { project_id: ["is invalid"] } }, status: :unprocessable_entity
          return
        end

        @job = @project.analysis_jobs.new(status: "pending")

        if @job.save
          begin
            # Initialize the analysis service
            service = AnalysisService.new(@job.id)

            # Start analysis (sets status to running)
            service.start_analysis(@project.id)

            # Perform the actual analysis
            results = service.perform_analysis(@project)

            # Update performance metrics separately
            PerformanceMetricsService.update_job_with_metrics(@job, results)

            render json: {
              data: ActiveModelSerializers::SerializableResource.new(@job.reload, adapter: :attributes).as_json
            }, status: :created
          rescue StandardError => e
            @job.update(status: "failed", error_message: e.message)
            Rails.logger.error("Analysis failed for job #{@job.id}: #{e.message}\n#{e.backtrace.join("\n")}")
            render json: { errors: { base: [e.message] } }, status: :unprocessable_entity
          end
        else
          render json: { errors: @job.errors }, status: :unprocessable_entity
        end
      end

      # Fetch results from the analysis service
      def fetch_results
        @job = AnalysisJob.includes(:project).find(params[:id])

        begin
          render json: {
            data: ActiveModelSerializers::SerializableResource.new(
              @job.reload, 
              adapter: :attributes,
              serializer: AnalysisJobSerializer
            ).as_json
          }
        rescue StandardError => e
          render json: { error: e.message }, status: :service_unavailable
        end
      end

      # Fetch pattern matches for a specific file
      def file_pattern_matches
        @job = AnalysisJob.find(params[:id])
        @file = @job.files_with_violations.find_by!(file_path: params[:file_path])
        
        # Paginate pattern matches to avoid large responses
        @pattern_matches = @file.pattern_matches
                               .page(params[:page])
                               .per(params[:per_page] || 100)
        
        render json: {
          data: ActiveModelSerializers::SerializableResource.new(
            @pattern_matches,
            each_serializer: PatternMatchSerializer
          ).as_json,
          meta: {
            file_path: @file.file_path,
            current_page: @pattern_matches.current_page,
            total_pages: @pattern_matches.total_pages,
            total_count: @pattern_matches.total_count
          }
        }
      end

      private

      def set_job
        @job = AnalysisJob.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Analysis job not found" }, status: :not_found
      end
    end
  end
end