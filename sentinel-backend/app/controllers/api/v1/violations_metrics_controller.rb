module Api
  module V1
    class ViolationsMetricsController < ApplicationController
      def index
        # Parse date range parameters with defaults
        start_date = params[:start_date] ? Date.parse(params[:start_date]) : 30.days.ago.to_date
        end_date = params[:end_date] ? Date.parse(params[:end_date]) : Date.today
        
        # Map interval parameter to PostgreSQL interval unit
        interval = case params[:interval]
                  when '1h' then 'hour'
                  when '6h' then 'hour' # We'll need to handle this specially
                  when '1d' then 'day'
                  when '1w' then 'week'
                  when '1M' then 'month'
                  else 'day' # default to daily grouping
                  end

        # Base query for violations with efficient joins
        base_select = if params[:interval] == '6h'
          # For 6h intervals, we use hour truncation and then group by 6-hour blocks
          "DATE_TRUNC('hour', violations.created_at) - 
           (EXTRACT(HOUR FROM violations.created_at)::integer % 6) * INTERVAL '1 hour' as period"
        else
          "DATE_TRUNC('#{interval}', violations.created_at) as period"
        end

        query = Violation.select(Arel.sql(base_select))
          .joins("INNER JOIN files_with_violations ON files_with_violations.id = violations.file_with_violations_id")
          .joins("INNER JOIN analysis_jobs ON analysis_jobs.id = files_with_violations.analysis_job_id")
          .where(created_at: start_date.beginning_of_day..end_date.end_of_day)

        # Add grouping by period and rule
        query = query.select("
            COUNT(*) as total_count,
            COUNT(DISTINCT files_with_violations.file_path) as affected_files_count,
            COUNT(DISTINCT analysis_jobs.id) as affected_jobs_count,
            violations.rule_id,
            violations.rule_name
          ")
          .group("period, violations.rule_id, violations.rule_name")
          .order("period DESC")

        # Execute query
        results = query.to_a

        # Format the results
        metrics = results.map do |row|
          {
            period: row['period'],
            rule_id: row['rule_id'],
            rule_name: row['rule_name'],
            total_violations: row['total_count'],
            affected_files: row['affected_files_count'],
            affected_jobs: row['affected_jobs_count']
          }
        end

        # Get unique rules and files for filters
        filters = {
          rules: Violation.select('DISTINCT rule_id, rule_name').map { |v| { id: v.rule_id, name: v.rule_name } },
          date_range: {
            start_date: start_date,
            end_date: end_date
          }
        }

        render json: {
          metrics: metrics,
          filters: filters
        }
      end
    end
  end
end
