module Api
  module V1
    class BuildMetricsController < ApplicationController
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