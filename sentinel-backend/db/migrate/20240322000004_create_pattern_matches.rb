class CreatePatternMatches < ActiveRecord::Migration[8.0]
  def change
    create_table :pattern_matches do |t|
      t.references :analysis_file, null: false, foreign_key: true
      t.string :rule_id
      t.string :rule_name, null: false
      t.text :description
      t.integer :start_line, null: false
      t.integer :end_line, null: false
      t.integer :start_col
      t.integer :end_col
      t.jsonb :metadata
      
      t.timestamps
    end
    
    add_index :pattern_matches, :rule_id
    add_index :pattern_matches, :rule_name
  end
end 