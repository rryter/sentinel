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
    
    # Handle pagination
    if resource.respond_to?(:page) && resource.respond_to?(:per)
      page = (params[:page] || 1).to_i
      per_page = (params[:per_page] || 10).to_i
      resource = resource.page(page).per(per_page)
      
      # Add pagination meta if not already present
      if serializer_options[:meta].nil?
        serializer_options[:meta] = {}
      end
      serializer_options[:meta].merge!(
        total_count: resource.total_count,
        page: page,
        per_page: per_page
      )
    end
    
    # Set content type and render
    response.headers['Content-Type'] = 'application/json'
    
    # Using AMS with attributes adapter for flat structure
    serialized_data = ActiveModelSerializers::SerializableResource.new(resource, **serializer_options).as_json
    
    render json: { data: serialized_data, meta: serializer_options[:meta] }, status: options[:status]
  end

  def not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def unprocessable_entity(exception)
    render json: { error: exception.message }, status: :unprocessable_entity
  end
end 