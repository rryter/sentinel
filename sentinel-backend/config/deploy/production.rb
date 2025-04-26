# server-based syntax
# ======================
# Defines a single server with a list of roles and multiple properties.
# You can define all roles on a single server, or split them:
server "twy04.nine.ch", user: "www-data", roles: %w[app db web]

set :rails_env, "production"
set :linked_files, fetch(:linked_files, []).push("config/database.yml", "config/secrets.yml", "config/master.key", "config/credentials/production.key")