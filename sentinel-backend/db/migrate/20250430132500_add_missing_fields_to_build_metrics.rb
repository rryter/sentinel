class AddMissingFieldsToBuildMetrics < ActiveRecord::Migration[8.0]
  def up
    # Check if columns already exist using execute and rescue
    begin
      execute "ALTER TABLE build_metrics ADD COLUMN build_entry_points TEXT"
    rescue ActiveRecord::StatementInvalid => e
      puts "Column build_entry_points already exists, skipping"
    end

    begin
      execute "ALTER TABLE build_metrics ADD COLUMN build_file_types JSON"
    rescue ActiveRecord::StatementInvalid => e
      puts "Column build_file_types already exists, skipping"
    end

    begin
      execute "ALTER TABLE build_metrics ADD COLUMN workspace_task VARCHAR(255)"
    rescue ActiveRecord::StatementInvalid => e
      puts "Column workspace_task already exists, skipping"
    end

    # Set defaults for existing rows that might not have values
    BuildMetric.where(build_entry_points: nil).update_all(build_entry_points: '[]')
    BuildMetric.where(build_file_types: nil).update_all(build_file_types: '{}')
  end

  def down
    begin
      remove_column :build_metrics, :build_entry_points
    rescue ActiveRecord::StatementInvalid => e
      puts "Column build_entry_points doesn't exist, skipping"
    end

    begin
      remove_column :build_metrics, :build_file_types
    rescue ActiveRecord::StatementInvalid => e
      puts "Column build_file_types doesn't exist, skipping"
    end

    begin
      remove_column :build_metrics, :workspace_task
    rescue ActiveRecord::StatementInvalid => e
      puts "Column workspace_task doesn't exist, skipping"
    end
  end
end
