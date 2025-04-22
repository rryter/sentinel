class RenameDurationMsInAnalysisJobs < ActiveRecord::Migration[7.1]
  def change
    rename_column :analysis_jobs, :duration_ms, :duration
  end
end