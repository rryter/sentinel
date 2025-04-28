module Api
  module V1
    class ViolationsController < ApplicationController
      before_action :set_analysis_job, only: [ :index, :time_series ], if: -> { params[:analysis_job_id].present? }

      def index
        # Support filtering by various attributes - use a more efficient join
        query = Violation.select("violations.*").joins(
          "INNER JOIN files_with_violations ON files_with_violations.id = violations.file_with_violations_id"
        ).joins(
          "INNER JOIN analysis_jobs ON analysis_jobs.id = files_with_violations.analysis_job_id"
        )

        # Filter by rule_name if provided
        if params[:rule_name].present?
          query = query.where(rule_name: params[:rule_name])
        end

        # Filter by rule_id if provided
        if params[:rule_id].present?
          query = query.where(rule_id: params[:rule_id])
        end

        # Filter by analysis_job_id - either from nested route or from query param
        if @analysis_job
          query = query.where("files_with_violations.analysis_job_id = ?", @analysis_job.id)
        elsif params[:analysis_job_id].present?
          query = query.where("files_with_violations.analysis_job_id = ?", params[:analysis_job_id])
        end

        # Filter by file path pattern if provided
        if params[:file_path].present?
          pattern = "%#{params[:file_path]}%"
          query = query.where("files_with_violations.file_path LIKE ?", pattern)
        end

        # Handle sorting
        sort_field = params[:sort] || "file_path"
        sort_direction = params[:direction] && %w[asc desc].include?(params[:direction].downcase) ? params[:direction].downcase : "asc"

        # Apply sorting based on the field
        case sort_field
        when "file_path"
          query = query.order("files_with_violations.file_path #{sort_direction}")
        when "rule_name"
          query = query.order("violations.rule_name #{sort_direction}")
        when "rule_id"
          query = query.order("violations.rule_id #{sort_direction}")
        else
          query = query.order("violations.id #{sort_direction}")
        end

        # Paginate results
        page = (params[:page] || 1).to_i
        per_page = (params[:per_page] || 25).to_i
        per_page = [ per_page, 100 ].min # Limit to 100 per page max

        # Preload associations to avoid N+1 queries
        @violations = query.includes(:file_with_violations => :analysis_job).page(page).per(per_page)

        meta = {
          total_count: @violations.total_count,
          current_page: @violations.current_page,
          total_pages: @violations.total_pages,
          analysis_job_id: @analysis_job&.id,
          sort: sort_field,
          direction: sort_direction
        }

        # Using AMS with optimized serialization to prevent N+1 queries
        # We need to include the file_with_violations association to maintain API compatibility
        # But we're using the preloaded associations to avoid additional queries
        serialized_data = ActiveModelSerializers::SerializableResource.new(
          @violations,
          each_serializer: ViolationSerializer,
          include: { file_with_violations: { only: [:file_path, :id] } },
          adapter: :attributes
        ).as_json

        render json: { data: serialized_data, meta: meta }
      end

      def time_series
        # Parse date range parameters with defaults
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 30.days.ago.to_date
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today

        # Get base query scope - use a more efficient join
        scope = Violation.joins("INNER JOIN files_with_violations ON files_with_violations.id = violations.file_with_violations_id")

        # Filter by analysis_job_id if we're in the nested route or if explicitly provided
        if @analysis_job
          scope = scope.where("files_with_violations.analysis_job_id = ?", @analysis_job.id)
        elsif params[:analysis_job_id].present?
          scope = scope.where("files_with_violations.analysis_job_id = ?", params[:analysis_job_id])
        end

        # Filter by rule_id if provided
        if params[:rule_id].present?
          scope = scope.where(rule_id: params[:rule_id])
        end

        # Filter by rule_name if provided
        if params[:rule_name].present?
          scope = scope.where(rule_name: params[:rule_name])
        end

        # Group by date and count violations
        # Using date_trunc to standardize how dates are formatted
        counts_by_date = scope
          .select("DATE(violations.created_at) as violation_date, COUNT(violations.id) as violation_count")
          .where(created_at: start_date.beginning_of_day..end_date.end_of_day)
          .group("DATE(violations.created_at)")
          .order("violation_date")
          .map { |result| [ result.violation_date.to_s, result.violation_count.to_i ] }
          .to_h

        # Format the data for the frontend, ensuring all dates in range are included
        time_series_data = []
        current_date = start_date

        while current_date <= end_date
          date_str = current_date.to_s
          count = counts_by_date[date_str] || 0

          time_series_data << {
            date: date_str,
            count: count
          }

          current_date = current_date + 1.day
        end

        # Add some sample data if everything is zero (for testing/development)
        if Rails.env.development? && time_series_data.all? { |data| data[:count] == 0 }
          # Add some random data for visualization testing
          time_series_data.each_with_index do |data, index|
            # Create some semi-random pattern for demonstration
            if index % 3 == 0
              data[:count] = rand(5..15)
            elsif index % 7 == 0
              data[:count] = rand(10..25)
            end
          end
        end

        render json: { data: time_series_data }
      end

      private

      def set_analysis_job
        @analysis_job = AnalysisJob.find(params[:analysis_job_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Analysis job not found" }, status: :not_found
      end
    end
  end
end
