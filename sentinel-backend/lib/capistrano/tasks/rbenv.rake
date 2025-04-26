namespace :rbenv do
  desc 'Install OpenSSL development package'
  task :install_openssl do
    on roles(:all) do
      execute :sudo, "apt-get update"
      execute :sudo, "apt-get install -y libssl-dev"
    end
  end
end

before 'rbenv:install', 'rbenv:install_openssl'
