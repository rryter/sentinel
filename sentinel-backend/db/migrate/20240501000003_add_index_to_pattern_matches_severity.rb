class AddIndexToPatternMatchesSeverity < ActiveRecord::Migration[8.0]
  def change
    # Check if the index exists before trying to add it
    unless index_exists?(:pattern_matches, :severity_id, name: 'index_pattern_matches_on_severity_id')
      add_index :pattern_matches, :severity_id, name: 'index_pattern_matches_on_severity_id'
    end
  end
end 