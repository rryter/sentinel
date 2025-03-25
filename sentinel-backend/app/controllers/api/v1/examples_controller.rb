class Api::V1::ExamplesController < ApplicationController
  # GET /api/v1/examples
  def index
    examples = [
      { id: 1, name: 'Example 1', description: 'This is the first example' },
      { id: 2, name: 'Example 2', description: 'This is the second example' }
    ]
    
    render json: examples
  end

  # GET /api/v1/examples/:id
  def show
    example = { id: params[:id].to_i, name: "Example #{params[:id]}", description: "This is example #{params[:id]}" }
    
    render json: example
  end

  # POST /api/v1/examples
  def create
    # In a real application, you would save the example to the database
    # For this demo, we'll just echo back the parameters
    new_example = { id: 3, name: params[:name], description: params[:description] }
    
    render json: new_example, status: :created
  end

  # PUT /api/v1/examples/:id
  def update
    # In a real application, you would update the example in the database
    # For this demo, we'll just echo back the parameters
    updated_example = { id: params[:id].to_i, name: params[:name], description: params[:description] }
    
    render json: updated_example
  end

  # DELETE /api/v1/examples/:id
  def destroy
    # In a real application, you would delete the example from the database
    # For this demo, we'll just return a success message
    
    render json: { message: "Example #{params[:id]} deleted successfully" }
  end
end
