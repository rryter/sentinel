class AddCommitHashAndBranchToBuildMetrics < ActiveRecord::Migration[8.0]
  def change
    add_column :build_metrics, :commit_hash, :string
    add_column :build_metrics, :branch_name, :string
  end
end
