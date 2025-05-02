class AddSignCountToCredentials < ActiveRecord::Migration[8.0]
  def change
    add_column :credentials, :sign_count, :integer
  end
end
