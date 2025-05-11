class CreateRuleGroupMemberships < ActiveRecord::Migration[8.0]
  def change
    create_table :rule_group_memberships do |t|
      t.references :rule, null: false, foreign_key: true
      t.references :rule_group, null: false, foreign_key: true
      t.integer :position

      t.timestamps
    end
  end
end
