# app/services/analysis_service.rb
class AnalysisService
    ANALYZER_SERVICE_URL = ENV.fetch('ANALYZER_SERVICE_URL', 'http://localhost:8080')
    
    def initialize(job_id)
      @job_id = job_id
    end
    
    # Check the status of a job from the Go service
    def check_status
      job = AnalysisJob.find(@job_id)
      
      # We need the Go job ID to check status
      if job.go_job_id.blank?
        Rails.logger.error("Cannot check status for job #{@job_id} - missing Go job ID")
        return nil
      end
      response = HTTP.get("#{ANALYZER_SERVICE_URL}/api/analyze/status/#{job.go_job_id}")
      
      if response.status.success?
        return JSON.parse(response.body.to_s)
      else
        Rails.logger.error("Failed to get job status from analyzer service: #{response.body}")
        return nil
      end
    rescue => e
      Rails.logger.error("Error checking job status from Go service: #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
      return nil
    end
    
    # Start the analysis by calling the Go service
    def start_analysis(project_id)
      job = AnalysisJob.find(@job_id)
      
      # Update job status
      job.update!(status: 'running')
      
      # Call the Go service API to start the analysis
      response = HTTP.post("#{ANALYZER_SERVICE_URL}/api/analyze", json: {
        job_id: @job_id.to_s,
        project_id: project_id.to_s
      })
      
      if response.status.success?
        result = JSON.parse(response.body.to_s)
        go_job_id = result['jobId'] || result['id']
        
        if go_job_id
          # Save the Go service job ID
          job.update!(go_job_id: go_job_id)
          Rails.logger.info("Analysis job #{@job_id} started successfully with Go job ID: #{go_job_id}")
        else
          Rails.logger.warn("Go service did not return a job ID for job #{@job_id}")
        end
        
        return true
      else
        error_message = "Failed to start analysis job in Go service: #{response.body}"
        Rails.logger.error(error_message)
        job.update!(status: 'failed', error_message: error_message)
        return false
      end
    rescue => e
      error_message = "Error starting analysis in Go service: #{e.message}"
      Rails.logger.error(error_message)
      Rails.logger.error(e.backtrace.join("\n"))
      job.update!(status: 'failed', error_message: error_message)
      return false
    end
    
    def fetch_patterns
      job = AnalysisJob.find(@job_id)
      
      # We need the Go job ID to fetch results
      if job.go_job_id.blank?
        Rails.logger.error("Cannot fetch patterns for job #{@job_id} - missing Go job ID")
        return nil
      end
      
      # Use the results endpoint, not the status endpoint
      Rails.logger.info("Fetching results from #{ANALYZER_SERVICE_URL}/api/analyze/results/#{job.go_job_id}")
      response = HTTP.get("#{ANALYZER_SERVICE_URL}/api/analyze/results/#{job.go_job_id}")
      
      if response.status.success?
        data = JSON.parse(response.body.to_s)
        Rails.logger.info("Received results for job #{@job_id}")
        job.update!(status: 'completed')
        data
      else
        Rails.logger.error("Failed to fetch patterns from analyzer service: #{response.status}")
        nil
      end
    end
    
    def process_results(analysis_job)
      data = fetch_patterns
      return false unless data
      
      # Update job with metadata
      analysis_job.update!(
        total_files: data['totalFiles'] || 0,
        processed_files: data['totalFiles'] || 0, # Use totalFiles since processedFiles isn't available
        status: 'completed',
        completed_at: Time.current
      )
      
      # Transform the groupedMatches format to fileResults if needed
      if data['fileResults'].nil? && data['groupedMatches'].present?
        # Create fileResults directly from groupedMatches
        file_results = {}
        
        data['groupedMatches'].each do |_rule_id, matches|
          matches.each do |match|
            file_path = match['filePath']
            file_results[file_path] ||= { 'filePath' => file_path, 'patternMatches' => [] }
            
            # Transform location data
            location = match['location'] || {}
            match_data = {
              'ruleId' => match['ruleId'],
              'ruleName' => match['ruleName'],
              'description' => match['description'],
              'location' => {
                'startLine' => location['line'],
                'endLine' => location['line'],
                'startCol' => location['column'],
                'endCol' => location['column']
              },
              'metadata' => match['metadata']
            }
            
            file_results[file_path]['patternMatches'] << match_data
          end
        end
        
        data['fileResults'] = file_results.values
      end
      
      # Safety check before processing file results
      if data['fileResults'].nil?
        Rails.logger.warn("No fileResults in data for job #{@job_id}.")
        return true # Still mark as completed even without file results
      end
      
      # Process file results
      ActiveRecord::Base.transaction do
        data['fileResults'].each do |file_result|
          analysis_file = analysis_job.analysis_files.find_or_create_by!(file_path: file_result['filePath'])
          
          # Store pattern matches
          if file_result['patternMatches'].present?
            file_result['patternMatches'].each do |match|
              analysis_file.pattern_matches.create!(
                rule_id: match['ruleId'],
                rule_name: match['ruleName'],
                description: match['description'],
                start_line: match['location']['startLine'],
                end_line: match['location']['endLine'],
                start_col: match['location']['startCol'],
                end_col: match['location']['endCol'],
                metadata: match['metadata']
              )
            end
          end
        end
      end
      
      true
    end
  end