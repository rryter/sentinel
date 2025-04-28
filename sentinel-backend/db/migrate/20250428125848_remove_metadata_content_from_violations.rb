class RemoveMetadataContentFromViolations < ActiveRecord::Migration[8.0]
  def up
    # First add the new jsonb column if it doesn't exist
    unless column_exists?(:violations, :metadata)
      add_column :violations, :metadata, :jsonb
    end

    # Migrate existing data from metadata_content to metadata
    execute(<<-SQL)
      UPDATE violations 
      SET metadata = metadata_content::jsonb
      WHERE metadata_content IS NOT NULL 
        AND metadata IS NULL;
    SQL

    # Remove the old column
    remove_column :violations, :metadata_content
  end

  def down
    # Add back the metadata_content column
    add_column :violations, :metadata_content, :text

    # Restore data from metadata to metadata_content
    execute(<<-SQL)
      UPDATE violations 
      SET metadata_content = metadata::text
      WHERE metadata IS NOT NULL;
    SQL

    # Remove the metadata column
    remove_column :violations, :metadata
  end
end
