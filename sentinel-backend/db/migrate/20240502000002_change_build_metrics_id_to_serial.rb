class ChangeBuildMetricsIdToSerial < ActiveRecord::Migration[7.1]
  def up
    # Drop the primary key constraint
    execute "ALTER TABLE build_metrics DROP CONSTRAINT build_metrics_pkey"
    
    # Change id column to be bigint and set it as serial
    change_column :build_metrics, :id, :bigint
    execute "ALTER TABLE build_metrics ALTER COLUMN id SET DEFAULT nextval('build_metrics_id_seq'::regclass)"
    execute "ALTER TABLE build_metrics ALTER COLUMN id SET NOT NULL"
    
    # Add back the primary key constraint
    execute "ALTER TABLE build_metrics ADD PRIMARY KEY (id)"
  end

  def down
    change_column :build_metrics, :id, :string
  end
end 