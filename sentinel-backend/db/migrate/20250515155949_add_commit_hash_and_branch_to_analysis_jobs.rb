class AddCommitHashAndBranchToAnalysisJobs < ActiveRecord::Migration[8.0]
  def change
    add_column :analysis_jobs, :commit_hash, :string
    add_column :analysis_jobs, :branch_name, :string
  end
end
