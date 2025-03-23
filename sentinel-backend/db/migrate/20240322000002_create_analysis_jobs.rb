class CreateAnalysisJobs < ActiveRecord::Migration[8.0]
  def change
    create_table :analysis_jobs do |t|
      t.references :project, null: false, foreign_key: true
      t.string :status, null: false, default: 'pending'
      t.integer :total_files
      t.integer :processed_files
      t.datetime :started_at
      t.datetime :completed_at
      
      t.timestamps
    end
    
    add_index :analysis_jobs, :status
  end
end 