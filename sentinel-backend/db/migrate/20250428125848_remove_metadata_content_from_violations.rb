class RemoveMetadataContentFromViolations < ActiveRecord::Migration[8.0]
  def change
    remove_column :violations, :metadata_content
  end
end
