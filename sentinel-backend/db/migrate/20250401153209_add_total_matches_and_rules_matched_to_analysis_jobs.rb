class AddTotalMatchesAndRulesMatchedToAnalysisJobs < ActiveRecord::Migration[8.0]
  def change
    add_column :analysis_jobs, :total_matches, :integer
    add_column :analysis_jobs, :rules_matched, :integer
  end
end
