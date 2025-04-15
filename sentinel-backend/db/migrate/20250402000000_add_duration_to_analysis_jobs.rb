class AddDurationToAnalysisJobs < ActiveRecord::Migration[8.0]
  def change
    add_column :analysis_jobs, :duration, :integer, comment: "Duration of the analysis in milliseconds"
  end
end 