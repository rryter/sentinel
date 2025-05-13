class AddConfigFieldsToRules < ActiveRecord::Migration[8.0]
  def change
    add_column :rules, :default_config, :text
    add_column :rules, :enabled_by_default, :boolean
  end
end
