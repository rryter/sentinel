class CreateRuleGroups < ActiveRecord::Migration[8.0]
  def change
    create_table :rule_groups do |t|
      t.string :name
      t.text :description

      t.timestamps
    end
  end
end
