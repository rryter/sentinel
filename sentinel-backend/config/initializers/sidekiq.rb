Sidekiq.configure_server do |config|
  config.redis = {
    url: ENV['REDIS_URL'] || 'redis://redis:6379/1',
    size: 25,
    network_timeout: 5,
    pool_timeout: 5
  }
end

Sidekiq.configure_client do |config|
  config.redis = {
    url: ENV['REDIS_URL'] || 'redis://redis:6379/1',
    size: 5,
    network_timeout: 5,
    pool_timeout: 5
  }
end 