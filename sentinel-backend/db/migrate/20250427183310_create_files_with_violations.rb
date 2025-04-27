class CreateFilesWithViolations < ActiveRecord::Migration[8.0]
  def change
    create_table :files_with_violations do |t|
      t.references :analysis_job, null: false, foreign_key: true
      t.string :file_path, null: false

      t.timestamps
    end

    add_index :files_with_violations, [:analysis_job_id, :file_path], unique: true
  end
end
