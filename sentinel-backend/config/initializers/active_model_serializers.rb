# Configure Active Model Serializers
ActiveModelSerializers.config.adapter = :json
ActiveModelSerializers.config.key_transform = :camel_lower

# Cache serializers for better performance
ActiveModelSerializers.config.cache_store = Rails.cache
ActiveModelSerializers.config.perform_caching = true
ActiveModelSerializers.config.cache_key_prefix = 'ams:v1' 