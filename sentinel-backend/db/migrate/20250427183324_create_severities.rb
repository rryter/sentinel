class CreateSeverities < ActiveRecord::Migration[8.0]
  def change
    create_table :severities do |t|
      t.string :name
      t.integer :level
      t.string :color_code
      t.text :description

      t.timestamps
    end
  end
end
