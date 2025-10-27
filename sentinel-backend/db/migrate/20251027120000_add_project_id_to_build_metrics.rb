class AddProjectIdToBuildMetrics < ActiveRecord::Migration[8.0]
  def change
    # Add project_id column as nullable initially to handle existing records
    add_reference :build_metrics, :project, foreign_key: true, null: true

    # Add index for better query performance
    add_index :build_metrics, [:project_id, :timestamp]
  end
end
