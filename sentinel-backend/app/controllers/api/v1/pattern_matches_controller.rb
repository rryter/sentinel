module Api
  module V1
    class PatternMatchesController < ApplicationController
      def index
        # Support filtering by various attributes
        query = PatternMatch.includes(analysis_file: :analysis_job)
        
        # Filter by rule_name if provided
        if params[:rule_name].present?
          query = query.where(rule_name: params[:rule_name])
        end
        
        # Filter by rule_id if provided
        if params[:rule_id].present?
          query = query.where(rule_id: params[:rule_id])
        end
        
        # Filter by analysis_job_id if provided
        if params[:analysis_job_id].present?
          query = query.where(analysis_files: { analysis_job_id: params[:analysis_job_id] })
        end
        
        # Filter by file path pattern if provided
        if params[:file_path].present?
          pattern = "%#{params[:file_path]}%"
          query = query.where("analysis_files.file_path LIKE ?", pattern)
        end
        
        # Paginate results
        page = (params[:page] || 1).to_i
        per_page = (params[:per_page] || 25).to_i
        per_page = [per_page, 100].min # Limit to 100 per page max
        
        @matches = query.page(page).per(per_page)
        
        render json: {
          matches: @matches,
          total_count: @matches.total_count,
          current_page: @matches.current_page,
          total_pages: @matches.total_pages
        }
      end
    end
  end
end 