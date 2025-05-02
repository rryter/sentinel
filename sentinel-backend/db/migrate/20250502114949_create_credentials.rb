class CreateCredentials < ActiveRecord::Migration[8.0]
  def change
    create_table :credentials do |t|
      t.references :user, null: false, foreign_key: true
      t.string :external_id
      t.text :public_key
      t.string :nickname

      t.timestamps
    end
  end
end
