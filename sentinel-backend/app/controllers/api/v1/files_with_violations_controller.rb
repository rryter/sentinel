module Api
  module V1
    class FilesWithViolationsController < ApplicationController
      def index
        # Support filtering by various attributes
        query = FileWithViolations.all

        # Filter by analysis_job_id if provided
        if params[:analysis_job_id].present?
          query = query.where(analysis_job_id: params[:analysis_job_id])
        end

        # Filter by file path pattern if provided
        if params[:file_path].present?
          pattern = "%#{params[:file_path]}%"
          query = query.where("file_path LIKE ?", pattern)
        end

        # Filter by rule name if provided
        if params[:rule_name].present?
          rule_names = params[:rule_name].split(',').map(&:strip)
          query = query
            .joins(:violations)
            .where(violations: { rule_name: rule_names })
            .distinct
        end

        # Handle sorting
        sort_field = params[:sort] || "file_path"
        sort_direction = params[:direction] && %w[asc desc].include?(params[:direction].downcase) ? params[:direction].downcase : "asc"

        # Apply sorting based on the field
        case sort_field
        when "file_path"
          query = query.order("file_path #{sort_direction}")
        when "analysis_job_id"
          query = query.order("analysis_job_id #{sort_direction}")
        when "violation_count"
          query = query
            .left_joins(:violations)
            .group(:id)
            .order("COUNT(violations.id) #{sort_direction}")
        else
          query = query.order("id #{sort_direction}")
        end

        # Paginate results
        page = (params[:page] || 1).to_i
        per_page = (params[:per_page] || 25).to_i
        per_page = [per_page, 100].min # Limit to 100 per page max

        @files_with_violations = query.page(page).per(per_page)

        meta = {
          total_count: @files_with_violations.total_count,
          current_page: @files_with_violations.current_page,
          total_pages: @files_with_violations.total_pages,
          sort: sort_field,
          direction: sort_direction
        }

        # Using AMS with array serializer to get flat array
        render json: {
          data: ActiveModel::Serializer::CollectionSerializer.new(
            @files_with_violations,
            serializer: FileWithViolationsSerializer,
            scope: { rule_name: params[:rule_name] }
          ).as_json,
          meta: meta
        }
      end
    end
  end
end 