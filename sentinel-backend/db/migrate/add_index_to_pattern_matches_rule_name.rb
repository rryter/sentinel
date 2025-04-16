class AddIndexToPatternMatchesRuleName < ActiveRecord::Migration[7.0]
  def change
    # Add an index on rule_name to speed up queries that group by rule_name
    add_index :pattern_matches, :rule_name, name: 'index_pattern_matches_on_rule_name'
  end
end 