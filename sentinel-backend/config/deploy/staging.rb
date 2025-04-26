# server-based syntax
# ======================
# Defines a single server with a list of roles and multiple properties.
# You can define all roles on a single server, or split them:
server "twy04.nine.ch", user: "www-data", roles: %w[app db web]
set :application, "test.api.scoper.cloud"

# Configuration
# =============
# You can set any configuration variable like in config/deploy.rb
# These variables are then only loaded and set in this stage.
# For available Capistrano configuration variables see the documentation page.
# http://capistranorb.com/documentation/getting-started/configuration/
# Feel free to add new variables to customise your setup.
set :rails_env, "staging"
set :branch, proc { `git rev-parse --abbrev-ref staging`.chomp }
set :linked_files, fetch(:linked_files, []).push("config/database.yml", "config/secrets.yml", "config/master.key", "env")