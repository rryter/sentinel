class AddGoJobIdToAnalysisJobs < ActiveRecord::Migration[8.0]
  def change
    add_column :analysis_jobs, :go_job_id, :string
  end
end
