class AddErrorMessageToAnalysisJobs < ActiveRecord::Migration[7.1]
  def change
    add_column :analysis_jobs, :error_message, :text
  end
end
