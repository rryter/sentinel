module Api
  module V1
    class BuildMetricsController < ApplicationController
      before_action :set_project
      
      def index
        query = BuildMetric.all

        # Filter by project based on route
        query = query.by_project(@project.name)

        # Filter by environment if specified
        if params[:environment].present?
          query = query.by_environment(params[:environment])
        end

        # Filter by time range
        if params[:start_time].present?
          begin
            start_time = Time.zone.parse(params[:start_time])
            query = query.where('timestamp >= ?', start_time)
          rescue ArgumentError
            # Invalid time format, ignore the filter
          end
        end

        if params[:end_time].present?
          begin
            end_time = Time.zone.parse(params[:end_time])
            query = query.where('timestamp <= ?', end_time)
          rescue ArgumentError
            # Invalid time format, ignore the filter
          end
        end

        # Get metrics grouped by time interval (default 1 hour)
        requested_interval = (params[:interval] || '1h').downcase
        # Validate interval and fallback to default
        valid_intervals = %w[1m 5m 15m 30m 1h 6h 12h 1d]
        interval = valid_intervals.include?(requested_interval) ? requested_interval : '1h'
        
        time_bucket =
          case interval
          when '1m'
            "DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00')"
          when '5m'
            "CONCAT(DATE_FORMAT(timestamp, '%Y-%m-%d %H:'), LPAD(FLOOR(MINUTE(timestamp)/5)*5, 2, '0'), ':00')"
          when '15m'
            "CONCAT(DATE_FORMAT(timestamp, '%Y-%m-%d %H:'), LPAD(FLOOR(MINUTE(timestamp)/15)*15, 2, '0'), ':00')"
          when '30m'
            "CONCAT(DATE_FORMAT(timestamp, '%Y-%m-%d %H:'), LPAD(FLOOR(MINUTE(timestamp)/30)*30, 2, '0'), ':00')"
          when '1h'
            "DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')"
          when '6h'
            "CONCAT(DATE_FORMAT(timestamp, '%Y-%m-%d '), LPAD(FLOOR(HOUR(timestamp)/6)*6, 2, '0'), ':00:00')"
          when '12h'
            "CONCAT(DATE_FORMAT(timestamp, '%Y-%m-%d '), LPAD(FLOOR(HOUR(timestamp)/12)*12, 2, '0'), ':00:00')"
          when '1d'
            "DATE_FORMAT(timestamp, '%Y-%m-%d 00:00:00')"
          else
            "DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')"
          end

        metrics = query
          .select([
            "#{time_bucket} as time_bucket",
            'MIN(timestamp) as min_timestamp',
            # Initial build metrics
            'AVG(CASE WHEN is_initial_build THEN duration_ms END) as initial_avg_duration_ms',
            'MIN(CASE WHEN is_initial_build THEN duration_ms END) as initial_min_duration_ms',
            'MAX(CASE WHEN is_initial_build THEN duration_ms END) as initial_max_duration_ms',
            'COUNT(CASE WHEN is_initial_build THEN 1 END) as initial_build_count',
            'SUM(CASE WHEN is_initial_build THEN build_error_count END) as initial_total_errors',
            'SUM(CASE WHEN is_initial_build THEN build_warning_count END) as initial_total_warnings',
            'AVG(CASE WHEN is_initial_build THEN build_files_count END) as initial_avg_files_count',
            # Hot reload metrics
            'AVG(CASE WHEN NOT is_initial_build THEN duration_ms END) as hot_reload_avg_duration_ms',
            'MIN(CASE WHEN NOT is_initial_build THEN duration_ms END) as hot_reload_min_duration_ms',
            'MAX(CASE WHEN NOT is_initial_build THEN duration_ms END) as hot_reload_max_duration_ms',
            'COUNT(CASE WHEN NOT is_initial_build THEN 1 END) as hot_reload_build_count',
            'SUM(CASE WHEN NOT is_initial_build THEN build_error_count END) as hot_reload_total_errors',
            'SUM(CASE WHEN NOT is_initial_build THEN build_warning_count END) as hot_reload_total_warnings',
            'AVG(CASE WHEN NOT is_initial_build THEN build_files_count END) as hot_reload_avg_files_count',
            # Overall system metrics
            'AVG(machine_memory_free) as avg_memory_free',
            'AVG(machine_memory_total) as avg_memory_total',
            # Git information
            'MAX(branch_name) as branch_name',
            'MAX(commit_hash) as commit_hash'
          ].join(', '))
          .group('time_bucket')
          .order(Arel.sql('time_bucket'))

        # Get unique projects and environments for filters
        available_filters = {
          projects: BuildMetric.distinct.pluck(:workspace_project),
          environments: BuildMetric.distinct.pluck(:workspace_environment),
          interval: interval
        }

        render json: {
          metrics: metrics.map { |m| {
            timestamp: m.min_timestamp,
            initial_builds: {
              avg_duration_sec: m.initial_avg_duration_ms ? (m.initial_avg_duration_ms / 1000.0).round(2) : nil,
              min_duration_sec: m.initial_min_duration_ms ? (m.initial_min_duration_ms / 1000.0).round(2) : nil,
              max_duration_sec: m.initial_max_duration_ms ? (m.initial_max_duration_ms / 1000.0).round(2) : nil,
              build_count: m.initial_build_count || 0,
              total_errors: m.initial_total_errors || 0,
              total_warnings: m.initial_total_warnings || 0,
              avg_files_count: m.initial_avg_files_count&.round
            },
            hot_reloads: {
              avg_duration_sec: m.hot_reload_avg_duration_ms ? (m.hot_reload_avg_duration_ms / 1000.0).round(2) : nil,
              min_duration_sec: m.hot_reload_min_duration_ms ? (m.hot_reload_min_duration_ms / 1000.0).round(2) : nil,
              max_duration_sec: m.hot_reload_max_duration_ms ? (m.hot_reload_max_duration_ms / 1000.0).round(2) : nil,
              build_count: m.hot_reload_build_count || 0,
              total_errors: m.hot_reload_total_errors || 0,
              total_warnings: m.hot_reload_total_warnings || 0,
              avg_files_count: m.hot_reload_avg_files_count&.round
            },
            system: {
              memory_usage_percent: (((m.avg_memory_total - m.avg_memory_free) / m.avg_memory_total.to_f) * 100).round(2)
            },
            git: {
              branch: m.branch_name,
              commit: m.commit_hash
            }
          }},
          filters: available_filters
        }
      end

      def create
        metrics = params[:metrics]
        
        if metrics.blank?
          render json: { error: 'No metrics provided' }, status: :bad_request
          return
        end

        results = []
        any_errors = false
        
        ActiveRecord::Base.transaction do
          metrics.each do |metric_params|
            # Log incoming parameters for debugging
            Rails.logger.info("Processing metric: #{metric_params.inspect}")
            
            permitted_params = metric_params.permit(
              :id,
              :timestamp,
              :duration_ms,
              :is_initial_build,
              :machine_hostname,
              :machine_platform,
              :machine_cpu_count,
              :machine_memory_total,
              :machine_memory_free,
              :process_node_version,
              :process_memory,
              :build_files_count,
              :build_output_dir,
              :build_error_count,
              :build_warning_count,
              :build_entry_points,
              :build_file_types,
              :workspace_name,
              :workspace_project,
              :workspace_environment,
              :workspace_user,
              :workspace_task,
              :branch_name,
              :commit_hash
            )
            
            build_metric = BuildMetric.new(permitted_params)
            
            # Store raw boolean value for validation
            build_metric.raw_is_initial_build = metric_params[:is_initial_build]

            if build_metric.save
              results << { id: build_metric.id, status: 'success' }
            else
              any_errors = true
              Rails.logger.error("Failed to save build metric: #{build_metric.errors.full_messages}")
              results << { 
                id: metric_params[:id], 
                status: 'error', 
                errors: build_metric.errors.as_json 
              }
            end
          end
        end

        # Determine status based on results
        success_count = results.count { |r| r[:status] == 'success' }
        error_count = results.count { |r| r[:status] == 'error' }
        
        status = if success_count > 0 && error_count > 0
                   :ok  # Mixed results - some succeeded, some failed
                 elsif success_count > 0 && error_count == 0
                   :created  # All succeeded
                 else
                   :unprocessable_entity  # All failed
                 end
                 
        render json: { results: results }, status: status
      end
      
      private
      
      def set_project
        @project = Project.find(params[:project_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Project not found' }, status: :not_found
      end
    end
  end
end