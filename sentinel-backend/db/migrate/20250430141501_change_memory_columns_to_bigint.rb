class ChangeMemoryColumnsToBigint < ActiveRecord::Migration[8.0]
  def change
    change_column :build_metrics, :machine_memory_total, :bigint
    change_column :build_metrics, :machine_memory_free, :bigint
    change_column :build_metrics, :process_memory, :bigint
  end
end
