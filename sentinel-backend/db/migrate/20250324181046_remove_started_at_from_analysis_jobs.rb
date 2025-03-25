class RemoveStartedAtFromAnalysisJobs < ActiveRecord::Migration[8.0]
  def up
    remove_column :analysis_jobs, :started_at
  end

  def down
    add_column :analysis_jobs, :started_at, :datetime
  end
end
