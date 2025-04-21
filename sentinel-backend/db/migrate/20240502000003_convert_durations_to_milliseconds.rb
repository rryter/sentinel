class ConvertDurationsToMilliseconds < ActiveRecord::Migration[7.1]
  def up
    # Convert build_metrics duration to milliseconds
    rename_column :build_metrics, :duration, :duration_old
    add_column :build_metrics, :duration_ms, :bigint, null: false, default: 0
    
    # Convert the float seconds to integer milliseconds
    execute <<-SQL
      UPDATE build_metrics 
      SET duration_ms = (duration_old * 1000)::bigint
    SQL
    
    remove_column :build_metrics, :duration_old

    # Convert any float durations in analysis_jobs to milliseconds
    rename_column :analysis_jobs, :duration, :duration_old
    add_column :analysis_jobs, :duration_ms, :bigint, null: false, default: 0
    
    execute <<-SQL
      UPDATE analysis_jobs 
      SET duration_ms = (duration_old * 1000)::bigint
    SQL
    
    remove_column :analysis_jobs, :duration_old
  end

  def down
    # Convert build_metrics milliseconds back to float seconds
    rename_column :build_metrics, :duration_ms, :duration_ms_old
    add_column :build_metrics, :duration, :float, null: false, default: 0.0
    
    execute <<-SQL
      UPDATE build_metrics 
      SET duration = duration_ms_old::float / 1000.0
    SQL
    
    remove_column :build_metrics, :duration_ms_old

    # Convert analysis_jobs milliseconds back to float seconds
    rename_column :analysis_jobs, :duration_ms, :duration_ms_old
    add_column :analysis_jobs, :duration, :float, null: false, default: 0.0
    
    execute <<-SQL
      UPDATE analysis_jobs 
      SET duration = duration_ms_old::float / 1000.0
    SQL
    
    remove_column :analysis_jobs, :duration_ms_old
  end
end 