class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity

  private

  # Helper method to render with serializer and include associations
  def render_serialized(resource, options = {})
    # Default options
    serializer_options = {}
    serializer_options[:include] = options[:include] if options[:include]
    serializer_options[:serializer] = options[:serializer] if options[:serializer]
    serializer_options[:each_serializer] = options[:each_serializer] if options[:each_serializer]
    serializer_options[:meta] = options[:meta] if options[:meta]
    serializer_options[:adapter] = options[:adapter] if options[:adapter]
    
    # Set scope and scope_name for authorization if using Pundit
    serializer_options[:scope] = current_user if defined?(current_user)
    serializer_options[:scope_name] = :current_user if defined?(current_user)
    
    # Set content type and render
    response.headers['Content-Type'] = 'application/json'
    render json: resource, status: options[:status] || :ok, **serializer_options
  end

  def not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def unprocessable_entity(exception)
    render json: { error: exception.message }, status: :unprocessable_entity
  end
end 