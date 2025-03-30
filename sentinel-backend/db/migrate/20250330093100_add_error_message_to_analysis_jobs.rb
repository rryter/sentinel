class AddErrorMessageToAnalysisJobs < ActiveRecord::Migration[8.0]
  def change
    add_column :analysis_jobs, :error_message, :text
  end
end
