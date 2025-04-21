class AddWorkspaceTaskToBuildMetrics < ActiveRecord::Migration[7.1]
  def change
    add_column :build_metrics, :workspace_task, :string
  end
end 