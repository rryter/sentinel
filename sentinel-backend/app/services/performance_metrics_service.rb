class PerformanceMetricsService
  # Update a job with performance metrics extracted from analysis results
  def self.update_job_with_metrics(job, results)
    return unless results.is_a?(Hash)
    
    # Extract metrics from different possible locations in the JSON
    metrics = {}
    
    # Try to get metrics from summary
    if results.has_key?('summary')
      summary = results['summary']
      metrics[:duration] = summary['total_duration_ms'] if summary.has_key?('total_duration_ms')
      metrics[:files_per_second_wall_time] = summary['files_per_second_wall_time'] if summary.has_key?('files_per_second_wall_time')
      metrics[:cumulative_processing_time_ms] = summary['cumulative_processing_time_ms'] if summary.has_key?('cumulative_processing_time_ms')
      metrics[:avg_time_per_file_ms] = summary['avg_time_per_file_ms'] if summary.has_key?('avg_time_per_file_ms')
      metrics[:files_per_second_cpu_time] = summary['files_per_second_cpu_time'] if summary.has_key?('files_per_second_cpu_time')
      metrics[:parallel_cores_used] = summary['parallel_cores_used'] if summary.has_key?('parallel_cores_used')
      metrics[:parallel_speedup_factor] = summary['parallel_speedup_factor'] if summary.has_key?('parallel_speedup_factor')
      metrics[:parallel_efficiency_percent] = summary['parallel_efficiency_percent'] if summary.has_key?('parallel_efficiency_percent')
    else
      # If no summary, try to extract directly from root or metadata
      metrics[:duration] = extract_duration(results)
    end
    
    # Update the job with the extracted metrics if any were found
    job.update(metrics) if metrics.any?
    
    Rails.logger.info("Updated job #{job.id} with performance metrics: #{metrics.inspect}")
  end
  
  # Helper method to extract duration from various places it might be found
  def self.extract_duration(results)
    if results.has_key?('metadata') && results['metadata'].has_key?('duration_ms')
      return results['metadata']['duration_ms'].to_i
    elsif results.has_key?('metadata') && results['metadata'].has_key?('duration')
      return results['metadata']['duration'].to_i
    elsif results.has_key?('duration_ms')
      return results['duration_ms'].to_i
    elsif results.has_key?('duration')
      return results['duration'].to_i
    end
    
    nil
  end
end 