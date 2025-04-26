lock "~> 3.16"
Rake::Task["deploy:assets:precompile"].clear
Rake::Task["deploy:assets:backup_manifest"].clear

set :assets_roles, [] # This skips asset-related tasks entirely

set :user, "www-data"
set :application, "api.scoper.cloud"
set :repo_url, -> { "git@github.com:rryter/sentinel.git" }

set :branch, ENV.fetch("CI_COMMIT_REF_NAME", "main")
set :deploy_to, "/home/#{fetch :user}/#{fetch :application}"
set :keep_releases, 5
set :repo_tree, 'sentinel-backend'

set :rbenv_type, :user
set :rbenv_ruby, File.read(".ruby-version").strip
set :rbenv_path, "/home/#{fetch :user}/.rbenv"

append :linked_files, "env"
append :linked_dirs, "log", "tmp/pids", "tmp/cache", "tmp/sockets", "vendor/bundle", "public/system"

before "systemd:app:validate", "systemd:app:setup"
after "deploy:publishing", "systemd:app:restart"