require "securerandom"

namespace :hosting do
  desc "Generate .env file"
  task :env_file do
    on roles(:all) do
      # Create an empty env file
      execute :touch, "#{shared_path}/env"
      execute :chmod, "600", "#{shared_path}/env"
    end
  end

  desc "Upload credentials key file for the current environment"
  task :upload_master_key do
    on roles(:all) do
      env = fetch(:rails_env)
      key_path = File.expand_path("config/credentials/#{env}.key")
      puts "\e[33mLooking for #{env}.key at: #{key_path}\e[0m"
      
      if File.exist?(key_path)
        execute :mkdir, "-p", "#{shared_path}/config/credentials"
        upload! key_path, "#{shared_path}/config/credentials/#{env}.key"
        execute :chmod, "600", "#{shared_path}/config/credentials/#{env}.key"
      else
        puts "\e[31mError: config/credentials/#{env}.key not found locally. Please ensure it exists in your development environment.\e[0m"
        puts "\e[31mYou can generate it by running: EDITOR=vim bin/rails credentials:edit --environment #{env}\e[0m"
        exit 1
      end
    end
  end

  desc "Setup the hosting-environment (virtual-host, database and basic-auth)"
  task setup: :init do
    invoke "hosting:virtual_host"
    invoke "hosting:create_database"
    invoke "hosting:database_yml"
    invoke "hosting:secrets_yml"
    invoke "hosting:env_file"
    invoke "hosting:upload_master_key"  # Add this line
    if fetch(:rails_env).to_s == "staging"
      invoke "hosting:adjust_rails_env"
    end
    if agree("Add basic authentication to the website? (yN) ")
      invoke "hosting:basic_auth"
    end
    invoke "hosting:print_passwords"
  end

  desc "Init variables for setup"
  task :init do
    set :website_name, fetch(:application)
    set :db_name, lambda {
      "#{fetch(:website_name).to_s.tr('-', '_').tr('.', '_').tr('/', '_').tr('\\', '_')}_#{fetch(:stage)}"
    }
    set :db_password, SecureRandom.base64(25)
    set :basic_auth_user, fetch(:db_name)
    set :basic_auth_password, SecureRandom.base64(8)
  end

  desc "Create virtual host if it doesn't already exist"
  task virtual_host: :init do
    on roles(:all) do
      website = fetch(:website_name)

      unless test("sudo nine-manage-vhosts virtual-host list | grep -w 'DOMAIN: #{website}'")
        execute :sudo, "nine-manage-vhosts", "virtual-host", :create, fetch(:website_name), "--webroot=#{current_path}/public"
      end
    end
  end

  desc "Create database if it doesn't already exist"
  task create_database: :init do
    on roles(:db) do
      user = fetch(:db_name)

      unless test("sudo nine-manage-databases database list | grep -w nmd_#{user}")
        execute :sudo, "nine-manage-databases", "database", :create, "nmd_#{user}"
      end
    end
  end

  desc "Generate database.yml"
  task database_yml: :init do
    fetch(:db_name)
    fetch(:db_password)

    yaml = {
      fetch(:rails_env).to_s => {
        "adapter" => "postgresql",
        "encoding" => "unicode",
        "database" => fetch(:db_name).to_s,
        "pool" => 5,
        "username" => fetch(:db_name).to_s,
        "password" => fetch(:db_password).to_s
      }
    }

    on roles(:all) do
      put YAML.dump(yaml),
          "#{shared_path}/config/database.yml",
          mode: "600"
    end
  end

  desc "Generate secrets.yml"
  task :secrets_yml do
    require "securerandom"
    key = SecureRandom.hex(64).to_s
    key.force_encoding("UTF-8")

    yaml = {
      fetch(:rails_env).to_s => {
        "secret_key_base" => "#{key}"
      }
    }

    on roles(:all) do
      put YAML.dump(yaml),
          "#{shared_path}/config/secrets.yml",
          mode: "600"
    end
  end

  desc "Add basic auth"
  task basic_auth: :init do
    on roles(:all) do
      user = fetch(:basic_auth_user)
      pwd = fetch(:basic_auth_password)

      execute :htpasswd, "-b /home/www-data/.htpasswd #{user} '#{pwd.gsub("'") { "\\'" }}'"

      [ "AuthType Basic", 'AuthName "Restricted Access"',
       "AuthUserFile /home/www-data/.htpasswd", "Require user #{user}" ].each do |string|
        execute :echo, string, ">>", "#{fetch(:deploy_to)}/.htaccess"
      end
    end
  end

  desc "Remove basic auth"
  task :remove_basic_auth do
    on roles(:all) do
      execute :rm, "#{fetch(:deploy_to)}/.htaccess"
      if fetch(:rails_env).to_s == "staging"
        invoke "hosting:adjust_rails_env"
      end
    end
  end

  desc "Adjust RailsEnv for passenger"
  task :adjust_rails_env do
    on roles(:all) do
      execute :echo, "RackEnv #{fetch(:rails_env)}", ">>", "#{fetch(:deploy_to)}/.htaccess"
    end
  end

  desc "Print passwords"
  task print_passwords: :init do
    puts "--- Database credentials:"
    puts fetch(:db_name)
    puts fetch(:db_password)
    puts "--- Basic Auth:"
    puts fetch(:basic_auth_user)
    puts fetch(:basic_auth_password)
  end
end

# Uploads the given string or file-like object to the current host
# context. Intended to be used within an on() or privileged_on() block.
# Accepts :owner and :mode options that affect the permissions of the
# remote file.
#
def put(string_or_io, remote_path, opts = {})
  sudo_exec = ->(*cmd) {
    cmd = [ :sudo ] + cmd if opts[:sudo]
    execute *cmd
  }

  tmp_path = "/tmp/#{SecureRandom.uuid}"

  owner = opts[:owner]
  mode = opts[:mode]

  source = if string_or_io.respond_to?(:read)
             string_or_io
  else
             StringIO.new(string_or_io.to_s)
  end

  sudo_exec.call :mkdir, "-p", File.dirname(remote_path)

  upload!(source, tmp_path)

  sudo_exec.call(:mv, "-f", tmp_path, remote_path)
  sudo_exec.call(:chown, owner, remote_path) if owner
  sudo_exec.call(:chmod, mode, remote_path) if mode
end

def agree(yes_or_no_question)
  $stdout.print(yes_or_no_question)
  $stdin.gets.to_s =~ /^y(es)?/i
end