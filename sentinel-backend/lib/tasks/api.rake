namespace :api do
  desc "Generate OpenAPI documentation"
  task :generate_docs => :environment do
    puts "Generating OpenAPI documentation..."
    system("bundle exec rake rswag:specs:swaggerize")
    puts "OpenAPI documentation generated at swagger/v1/swagger.json"
  end
end 