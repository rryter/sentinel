# frozen_string_literal: true

# Kaminari configuration
Kaminari.configure do |config|
  config.default_per_page = 10
  config.window = 2
  config.outer_window = 1
  config.left = 2
  config.right = 2
  
  # Configure the default page method name
  config.page_method_name = :page
end 