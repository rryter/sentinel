require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module SentinelBackend
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.0

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Add serializers directory to autoload paths
    config.autoload_paths += %W[#{config.root}/app/serializers]
    
    # API mode configuration
    config.api_only = true
    
    # Configure cookies and session directly as this is an API-only app
    config.session_store :cookie_store, key: '_sentinel_session'
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use config.session_store
    
    # Set SameSite=None for cross-origin cookies, but only in production
    # In development, we need to use Lax to avoid issues with http://localhost
    if Rails.env.production?
      config.action_dispatch.cookies_same_site_protection = :none
      config.action_dispatch.cookies_secure = true
    else
      config.action_dispatch.cookies_same_site_protection = :lax
      config.action_dispatch.cookies_secure = false
    end
    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")
  end
end
