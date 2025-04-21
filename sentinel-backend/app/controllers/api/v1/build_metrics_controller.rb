module Api
  module V1
    class BuildMetricsController < ApplicationController
      def index
        query = BuildMetric.all  # Changed from BuildMetric.recent to start with a clean query

        # Filter by project if specified
        if params[:project].present?
          query = query.by_project(params[:project])
        end

        # Filter by environment if specified
        if params[:environment].present?
          query = query.by_environment(params[:environment])
        end

        # Filter by time range
        if params[:start_time].present?
          start_time = Time.zone.parse(params[:start_time])
          query = query.where('timestamp >= ?', start_time.to_i * 1000)
        end

        if params[:end_time].present?
          end_time = Time.zone.parse(params[:end_time])
          query = query.where('timestamp <= ?', end_time.to_i * 1000)
        end

        # Get metrics grouped by time interval (default 1 hour)
        interval = (params[:interval] || '1h').downcase
        interval_seconds = case interval
                         when '5m' then 5.minutes
                         when '15m' then 15.minutes
                         when '30m' then 30.minutes
                         when '1h' then 1.hour
                         when '6h' then 6.hours
                         when '12h' then 12.hours
                         when '1d' then 1.day
                         else 1.hour
                         end

        # Convert interval to milliseconds for timestamp grouping
        interval_ms = interval_seconds * 1000
        
        # Create the time bucket expression
        time_bucket = "(timestamp / #{interval_ms}) * #{interval_ms}"

        # Build the query with proper grouping
        metrics = query
          .select([
            time_bucket,
            'MIN(timestamp) as min_timestamp',
            'AVG(duration_ms) as avg_duration_ms',
            'MIN(duration_ms) as min_duration_ms',
            'MAX(duration_ms) as max_duration_ms',
            'COUNT(*) as build_count',
            'SUM(build_error_count) as total_errors',
            'SUM(build_warning_count) as total_warnings',
            'AVG(build_files_count) as avg_files_count',
            'AVG(machine_memory_free) as avg_memory_free',
            'AVG(machine_memory_total) as avg_memory_total'
          ].join(', '))
          .group(time_bucket)
          .order(Arel.sql(time_bucket))

        # Get unique projects and environments for filters
        available_filters = {
          projects: BuildMetric.distinct.pluck(:workspace_project),
          environments: BuildMetric.distinct.pluck(:workspace_environment)
        }

        render json: {
          metrics: metrics.map { |m| {
            timestamp: m.min_timestamp,  # Changed from m.timestamp to m.min_timestamp
            avg_duration_sec: (m.avg_duration_ms / 1000.0).round(2),
            min_duration_sec: (m.min_duration_ms / 1000.0).round(2),
            max_duration_sec: (m.max_duration_ms / 1000.0).round(2),
            build_count: m.build_count,
            total_errors: m.total_errors,
            total_warnings: m.total_warnings,
            avg_files_count: m.avg_files_count.round,
            memory_usage_percent: (((m.avg_memory_total - m.avg_memory_free) / m.avg_memory_total.to_f) * 100).round(2)
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
        ActiveRecord::Base.transaction do
          metrics.each do |metric_params|
            build_metric = BuildMetric.new(metric_params.permit(
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
              :workspace_user
            ))

            if build_metric.save
              results << { id: build_metric.id, status: 'success' }
            else
              results << { 
                id: metric_params[:id], 
                status: 'error', 
                errors: build_metric.errors.full_messages 
              }
            end
          end
        end

        render json: { results: results }, status: :created
      end
    end
  end
end 