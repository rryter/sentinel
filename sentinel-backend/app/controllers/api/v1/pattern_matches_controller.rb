module Api
  module V1
    class PatternMatchesController < ApplicationController
      before_action :set_analysis_job, only: [:index, :time_series], if: -> { params[:analysis_job_id].present? }
      
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
        
        # Filter by analysis_job_id - either from nested route or from query param
        if @analysis_job
          query = query.where(analysis_files: { analysis_job_id: @analysis_job.id })
        elsif params[:analysis_job_id].present?
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
          matches: @matches.as_json(include: { analysis_file: { only: [:file_path] } }),
          total_count: @matches.total_count,
          current_page: @matches.current_page,
          total_pages: @matches.total_pages,
          analysis_job_id: @analysis_job&.id
        }
      end

      def time_series
        # Parse date range parameters with defaults
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 30.days.ago.to_date
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        # Get base query scope
        scope = PatternMatch.joins(analysis_file: :analysis_job)
        
        # Filter by analysis_job_id if we're in the nested route or if explicitly provided
        if @analysis_job
          scope = scope.where(analysis_files: { analysis_job_id: @analysis_job.id })
        elsif params[:analysis_job_id].present?
          scope = scope.where(analysis_files: { analysis_job_id: params[:analysis_job_id] })
        end
        
        # Filter by rule_id if provided
        if params[:rule_id].present?
          scope = scope.where(rule_id: params[:rule_id])
        end
        
        # Filter by rule_name if provided
        if params[:rule_name].present?
          scope = scope.where(rule_name: params[:rule_name])
        end
        
        # Group by date and count pattern matches
        # Using date_trunc to standardize how dates are formatted
        counts_by_date = scope
          .select("DATE(pattern_matches.created_at) as match_date, COUNT(*) as match_count")
          .where(pattern_matches: { created_at: start_date.beginning_of_day..end_date.end_of_day })
          .group("DATE(pattern_matches.created_at)")
          .order("match_date")
          .map { |result| [result.match_date.to_s, result.match_count.to_i] }
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
        
        render json: time_series_data
      end
      
      private
      
      def set_analysis_job
        @analysis_job = AnalysisJob.find(params[:analysis_job_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Analysis job not found' }, status: :not_found
      end
    end
  end
end 