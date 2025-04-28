class RemoveMetadataContentFromViolations < ActiveRecord::Migration[8.0]
  def up
    # First, ensure any existing metadata_content is properly migrated to metadata column
    execute(<<-SQL)
      UPDATE violations 
      SET metadata = metadata_content::jsonb
      WHERE metadata_content IS NOT NULL
    SQL

    remove_column :violations, :metadata_content
  end

  def down
    add_column :violations, :metadata_content, :text

    # Restore data from metadata column if needed
    execute(<<-SQL)
      UPDATE violations 
      SET metadata_content = metadata::text
      WHERE metadata IS NOT NULL
    SQL
  end
end
