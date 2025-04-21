class CreateSeverities < ActiveRecord::Migration[8.0]
  def change
    create_table :severities do |t|
      t.string :name, null: false
      t.timestamps
    end

    add_index :severities, :name, unique: true

    # Add default severity levels that match Rust's severity levels
    reversible do |dir|
      dir.up do
        execute <<-SQL
          INSERT INTO severities (name, created_at, updated_at)
          VALUES 
            ('error', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('warning', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('info', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        SQL
      end
    end
  end
end 