class CreateProjectRules < ActiveRecord::Migration[8.0]
  def change
    create_table :project_rules do |t|
      t.references :rule, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.boolean :enabled

      t.timestamps
    end
  end
end
