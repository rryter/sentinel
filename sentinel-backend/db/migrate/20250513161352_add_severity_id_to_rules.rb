class AddSeverityIdToRules < ActiveRecord::Migration[8.0]
  def change
    add_reference :rules, :severity, null: false, foreign_key: true
  end
end
