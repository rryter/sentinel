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

            # Extract metrics from the results and update the job
            update_job_with_performance_metrics(@job, results)

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

      def update_job_with_performance_metrics(job, results)
        return unless results.is_a?(Hash)
        
        # Extract metrics from different possible locations in the JSON
        metrics = {}
        
        # Try to get metrics from summary
        if results.has_key?('summary')
          summary = results['summary']
          metrics[:duration] = summary['total_duration_ms'] if summary.has_key?('total_duration_ms')
          metrics[:files_processed] = summary['files_processed'] if summary.has_key?('files_processed')
          metrics[:files_per_second_wall_time] = summary['files_per_second_wall_time'] if summary.has_key?('files_per_second_wall_time')
          metrics[:cumulative_processing_time_ms] = summary['cumulative_processing_time_ms'] if summary.has_key?('cumulative_processing_time_ms')
          metrics[:avg_time_per_file_ms] = summary['avg_time_per_file_ms'] if summary.has_key?('avg_time_per_file_ms')
          metrics[:files_per_second_cpu_time] = summary['files_per_second_cpu_time'] if summary.has_key?('files_per_second_cpu_time')
          metrics[:parallel_cores_used] = summary['parallel_cores_used'] if summary.has_key?('parallel_cores_used')
          metrics[:parallel_speedup_factor] = summary['parallel_speedup_factor'] if summary.has_key?('parallel_speedup_factor')
          metrics[:parallel_efficiency_percent] = summary['parallel_efficiency_percent'] if summary.has_key?('parallel_efficiency_percent')
        end
        
        # Update the job with the extracted metrics
        job.update(metrics) if metrics.any?
        
        Rails.logger.info("Updated job #{job.id} with performance metrics: #{metrics.inspect}")
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

        output_file = Rails.root.join("../sentinel-analysis/findings/findings.json")

        unless status.success?
          Rails.logger.error("Error executing sentinel-analysis: #{stderr}")
          raise "Analysis failed: #{stderr}"
        end

        # Read and parse the results file
        if File.exist?(output_file)
          results = JSON.parse(File.read(output_file))
          Rails.logger.info("Analysis completed successfully with #{results.size} results")
          
          # Todo: Clean up
          # Extract duration from results and save it to the job
          if results.is_a?(Hash) && results.has_key?('metadata') && results['metadata'].has_key?('duration_ms')
            duration_ms = results['metadata']['duration_ms'].to_i
            job.update(duration: duration_ms)
            Rails.logger.info("Analysis job #{job.id} took #{duration_ms} ms to complete")
          elsif results.is_a?(Hash) && results.has_key?('metadata') && results['metadata'].has_key?('duration')
            duration_ms = results['metadata']['duration'].to_i
            job.update(duration: duration_ms)
            Rails.logger.info("Analysis job #{job.id} took #{duration_ms} ms to complete")
          elsif results.is_a?(Hash) && results.has_key?('duration_ms')
            duration_ms = results['duration_ms'].to_i
            job.update(duration: duration_ms)
            Rails.logger.info("Analysis job #{job.id} took #{duration_ms} ms to complete")
          elsif results.is_a?(Hash) && results.has_key?('duration')
            duration_ms = results['duration'].to_i
            job.update(duration: duration_ms)
            Rails.logger.info("Analysis job #{job.id} took #{duration_ms} ms to complete")
          end
          
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