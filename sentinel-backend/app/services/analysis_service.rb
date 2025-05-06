require "fileutils"
require "open3"

# app/services/analysis_service.rb
class AnalysisService
    def analyzer_service_url
      ENV.fetch("ANALYZER_SERVICE_URL", "http://localhost:8080")
    end

    def initialize(job_id)
      @job_id = job_id
    end

    # Start the analysis by calling the Go service
    def start_analysis(project_id)
      job = AnalysisJob.find(@job_id)

      # Update job status
      job.update!(status: "running")

      # Call the Go service API to start the analysis
      response = HTTP.post("#{analyzer_service_url}/api/analyze", json: {
        job_id: @job_id.to_s,
        project_id: project_id.to_s
      })

      if response.status.success?
        result = JSON.parse(response.body.to_s)
        job_id = result["jobId"] || result["id"]

        if job_id
          # Save the Go service job ID
          job.update!(job_id: job_id)
          Rails.logger.info("Analysis job #{@job_id} started successfully with Go job ID: #{go_job_id}")
        else
          Rails.logger.warn("Go service did not return a job ID for job #{@job_id}")
        end

        true
      else
        error_message = "Failed to start analysis job in Go service: #{response.body}"
        Rails.logger.error(error_message)
        job.update!(status: "failed", error_message: error_message)
        false
      end
    rescue => e
      error_message = "Error starting analysis in Go service: #{e.message}"
      Rails.logger.error(error_message)
      Rails.logger.error(e.backtrace.join("\n"))
      job.update!(status: "failed", error_message: error_message)
      false
    end

    def fetch_patterns
      job = AnalysisJob.find(@job_id)

      # Use the results endpoint, not the status endpoint
      Rails.logger.info("Fetching results from #{analyzer_service_url}/api/analyze/results/#{job.go_job_id}")
      response = HTTP.get("#{analyzer_service_url}/api/analyze/results/#{job.go_job_id}")

      if response.status.success?
        data = JSON.parse(response.body.to_s)
        Rails.logger.info("Received results for job #{@job_id}")
        job.update!(status: "completed")
        data
      else
        Rails.logger.error("Failed to fetch patterns from analyzer service: #{response.status}")
        nil
      end
    end

    def process_results(analysis_job)
      # Fetch data from Go service
      data = fetch_patterns
      return false unless data

      # Calculate total matches and unique rules
      total_matches = 0
      unique_rules = Set.new

      # Update job with metadata
      analysis_job.update!(
        total_files: data["totalFiles"] || 0,
        status: "completed",
        completed_at: Time.current
      )

      # Transform the groupedMatches format to fileResults if needed
      if data["fileResults"].nil? && data["groupedMatches"].present?
        # Create fileResults directly from groupedMatches
        file_results = {}

        data["groupedMatches"].each do |rule_id, matches|
          unique_rules.add(rule_id)
          total_matches += matches.length

          matches.each do |match|
            file_path = match["filePath"]
            file_results[file_path] ||= { "filePath" => file_path, "patternMatches" => [] }

            # Transform location data
            location = match["location"] || {}
            match_data = {
              "ruleId" => match["ruleId"],
              "ruleName" => match["ruleName"],
              "description" => match["description"],
              "location" => {
                "startLine" => location["line"],
                "endLine" => location["line"],
                "startCol" => location["column"],
                "endCol" => location["column"]
              },
            }

            file_results[file_path]["patternMatches"] << match_data
          end
        end

        data["fileResults"] = file_results.values
      end

      # Safety check before processing file results
      if data["fileResults"].nil?
        Rails.logger.warn("No fileResults in data for job #{@job_id}.")
        return true # Still mark as completed even without file results
      end

      # Process file results
      ActiveRecord::Base.transaction do
        data["fileResults"].each do |file_result|
          file_with_violations = analysis_job.files_with_violations.find_or_create_by!(file_path: file_result["filePath"])

          # Store violations
          if file_result["patternMatches"].present?
            file_result["patternMatches"].each do |match|
              file_with_violations.violations.create!(
                rule_id: match["ruleId"],
                rule_name: match["ruleName"],
                description: match["description"],
                start_line: match["location"]["startLine"],
                end_line: match["location"]["endLine"],
                start_col: match["location"]["startCol"],
                end_col: match["location"]["endCol"],
              )
            end
          end
        end
      end

      true
    end

    def perform_analysis(project)
      # Path to the Rust binary
      binary_path = Rails.root.join("../sentinel-analysis/target/release/scoper")

      # Create a temporary directory for output
      output_dir = Rails.root.join("tmp", "analysis_job_#{@job_id}")
      FileUtils.mkdir_p(output_dir)

      job = AnalysisJob.find(@job_id)

      # Build command with appropriate arguments
      command = [
        binary_path.to_s,
        "--output-dir=#{output_dir}"
      ]

      # Log the command being executed
      Rails.logger.info("Executing: #{command.join(' ')}")

      # Execute command and capture output
      stdout, stderr, status = Open3.capture3(*command)

      output_file = File.join(output_dir, "findings.json")

      unless status.success?
        Rails.logger.error("Error executing sentinel-analysis: #{stderr}")
        job.update(status: "failed", error_message: stderr)
        raise "Analysis failed: #{stderr}"
      end

      # Read and parse the results file
      if File.exist?(output_file)
        results = JSON.parse(File.read(output_file))
        Rails.logger.info("Analysis completed successfully with #{results.size} results")

        # Process the findings directly
        if process_findings(job, results)
          Rails.logger.info("Successfully processed #{results['findings']&.size || 0} findings for job #{job.id}")
          # Mark job as completed
          job.update(status: "completed")
        else
          Rails.logger.warn("Failed to process findings for job #{job.id}")
          job.update(status: "failed", error_message: "Failed to process findings")
        end

        results
      else
        error_message = "Analysis output file not found: #{"./sentinel-analysis/findings/findings.json"}"
        job.update(status: "failed", error_message: error_message)
        raise error_message
      end
    ensure
      # Clean up temporary files unless we want to keep them for debugging
      FileUtils.rm_rf(output_dir) if output_dir && !Rails.env.development?
    end

    # New method to process findings submitted via API
    def process_submitted_findings(findings_data)
      analysis_job = AnalysisJob.find(@job_id) # @job_id is set in initialize
      # The core logic is the same as process_findings, so we can call it.
      # process_findings expects an AnalysisJob object as its first argument.
      process_findings(analysis_job, findings_data)
    end

    def process_findings(analysis_job, findings_data)
      # Validate input
      unless findings_data.is_a?(Hash) && findings_data["findings"].is_a?(Array)
        Rails.logger.error("Invalid findings data format for job #{analysis_job.id}")
        return false
      end

      ActiveRecord::Base.transaction do
        # Group findings by file path first
        findings_by_file = findings_data["findings"].group_by { |finding| finding["file"] }

        # Create all file_with_violations records in bulk
        file_path_to_id = {}
        files_to_create = findings_by_file.keys.map do |file_path|
          {
            analysis_job_id: analysis_job.id,
            file_path: file_path,
            created_at: Time.current,
            updated_at: Time.current
          }
        end

        # Bulk insert the file records
        if files_to_create.any?
          # First, check for existing files to avoid duplicates
          existing_files = analysis_job.files_with_violations.where(file_path: findings_by_file.keys).pluck(:file_path, :id).to_h

          # Filter out files that already exist
          files_to_create.reject! { |file| existing_files.key?(file[:file_path]) }

          # Add existing files to the mapping
          file_path_to_id.merge!(existing_files)

          # Bulk insert new files if any remain
          if files_to_create.any?
            # ActiveRecord::ConnectionAdapters::Mysql2Adapter does not support :returning
            # So we insert without it and then fetch the records.
            FileWithViolations.insert_all(files_to_create)

            # Fetch the newly created records to get their IDs
            # Assuming file_path is unique per analysis_job_id for these new records
            newly_created_paths = files_to_create.map { |f| f[:file_path] }
            analysis_job.files_with_violations.where(file_path: newly_created_paths).each do |fwv|
              file_path_to_id[fwv.file_path] = fwv.id
            end
          end
        end

        # Prepare violations for bulk insert
        violations_to_create = []

        findings_by_file.each do |file_path, findings|
          file_id = file_path_to_id[file_path]
          next unless file_id

          findings.each do |finding|
            # Find or use default severity
            severity_object = nil
            if finding["severity"].present?
              mapped_severity_name = Severity.map_legacy_severity(finding["severity"])
              severity_object = Severity.find_by_name_ignore_case(mapped_severity_name)
            end

            # If not found by name or if finding["severity"] was blank, try to use the default
            if severity_object.nil?
              severity_object = Severity.default
            end

            severity_id = nil
            if severity_object
              severity_id = severity_object.id
            else
              # This is a fallback if Severity.default also returns nil
              Rails.logger.warn("Could not determine severity for finding: #{finding.inspect}. Neither specific nor default severity found. Consider configuring a default severity.")
              # Depending on requirements, you might want to assign a predefined fallback ID
              # or ensure the 'severity_id' column in 'violations' can be NULL.
            end

            violations_to_create << {
              file_with_violations_id: file_id,
              rule_id: nil, # Can be added if available in the data
              rule_name: finding["rule"],
              description: finding["message"],
              start_line: finding["line"],
              end_line: finding["line"], # Same as start line if not specified
              start_col: finding["column"],
              end_col: finding["column"] + 1, # Estimate end column if not provided
              severity_id: severity_id,
              created_at: Time.current,
              updated_at: Time.current
            }
          end
        end

        # Perform bulk insert of violations in batches to avoid memory issues
        if violations_to_create.any?
          # Batch inserts in groups of 500 for better performance
          violations_to_create.each_slice(500) do |batch|
            Violation.insert_all(batch)
          end
        end

        # Update summary statistics in analysis job
        analysis_job.update!(
          total_files: findings_data["summary"]&.dig("files_processed") || findings_by_file.keys.count,
          total_matches: findings_data["findings"].size,
          rules_matched: findings_data["summary"]&.dig("findings_by_rule")&.keys&.size || 0
        )

        # Update performance metrics using the dedicated service
        PerformanceMetricsService.update_job_with_metrics(analysis_job, findings_data)
      end

      true
    end
end
