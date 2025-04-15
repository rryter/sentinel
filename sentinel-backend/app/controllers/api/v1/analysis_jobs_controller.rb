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
          render json: { errors: { project_id: ["is invalid"] } }, status: :unprocessable_entity
          return
        end

        @job = @project.analysis_jobs.new(status: "pending")

        if @job.save
          begin
            # Update status to 'running' or another valid status before processing
            @job.update(status: "running")

            # Run the analysis directly
            results = perform_analysis(@project, @job)

            # Process results immediately
            # process_results(@job, results)

            # Update to completed when done
            @job.update(status: "completed")

            render json: {
              data: ActiveModelSerializers::SerializableResource.new(@job, adapter: :attributes).as_json
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

      # Add the fetch_results action
      def fetch_results
        @job = AnalysisJob.find(params[:id])

        begin
          if @job.fetch_results
            render json: {
              data: ActiveModelSerializers::SerializableResource.new(@job, adapter: :attributes).as_json
            }
          else
            render json: { error: "Failed to fetch analysis results" }, status: :service_unavailable
          end
        rescue StandardError => e
          render json: { error: "Failed to fetch analysis results" }, status: :service_unavailable
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Analysis job not found" }, status: :not_found
      end

      # Add the process_results action
      private

      def set_job
        @job = AnalysisJob.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Analysis job not found" }, status: :not_found
      end

      def perform_analysis(project, job)
        # Path to the Rust binary
        binary_path = Rails.root.join("../sentinel-analysis/target/release/typescript-analyzer")

        # Create a temporary directory for output
        output_dir = Rails.root.join("tmp", "analysis_job_#{job.id}")
        FileUtils.mkdir_p(output_dir)

        # Build command with appropriate arguments
        # Adjust these arguments based on your Rust binary's requirements
        command = [
          binary_path.to_s,
          "--export-json"
        ]

        # Log the command being executed
        Rails.logger.info("Executing: #{command.join(' ')}")

        # Execute command and capture output
        stdout, stderr, status = Open3.capture3(*command)

        output_file = Rails.root.join("../sentinel-analysis/findings/findings/findings.json")

        unless status.success?
          Rails.logger.error("Error executing sentinel-analysis: #{stderr}")
          raise "Analysis failed: #{stderr}"
        end

        # Read and parse the results file
        if File.exist?(output_file)
          results = JSON.parse(File.read(output_file))
          Rails.logger.info("Analysis completed successfully with #{results.size} results")
          results
        else
          raise "Analysis output file not found: #{"./sentinel-analysis/findings/findings.json"}"
        end
      ensure
        # Clean up temporary files unless we want to keep them for debugging
        FileUtils.rm_rf(output_dir) if output_dir && !Rails.env.development?
      end

      def process_results(job, results)
        return if results.nil? || results.empty?

        # Group results by file path
        results_by_file = results.group_by { |r| r["file_path"] }

=begin
        ActiveRecord::Base.transaction do
          results_by_file.each do |file_path, violations|
            # Create file record
            file = job.files_with_violations.create!(file_path: file_path)

            # Create violation records for each finding
            violations.each do |violation|
              file.pattern_matches.create!(
                rule_id: violation['rule_id'],
                rule_name: violation['rule_name'],
                message: violation['message'],
                line: violation['line'],
                column: violation['column'],
                severity: violation['severity'] || 'error',
                source_snippet: violation['source_snippet']
              )
            end
          end
        end
=end

        Rails.logger.info("Processed #{results.size} violations across #{results_by_file.size} files for job #{job.id}")
      end
    end
  end
end