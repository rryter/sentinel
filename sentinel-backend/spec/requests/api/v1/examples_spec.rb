require 'swagger_helper'

RSpec.describe 'Api::V1::Examples', type: :request do
  path '/api/v1/examples' do
    get 'Lists all examples' do
      tags 'Examples'
      produces 'application/json'
      
      response '200', 'examples found' do
        schema type: :array,
          items: {
            type: :object,
            properties: {
              id: { type: :integer },
              name: { type: :string },
              description: { type: :string }
            },
            required: ['id', 'name', 'description']
          }
          
        run_test!
      end
    end
    
    post 'Creates an example' do
      tags 'Examples'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :example, in: :body, schema: {
        type: :object,
        properties: {
          name: { type: :string },
          description: { type: :string }
        },
        required: ['name', 'description']
      }
      
      response '201', 'example created' do
        let(:example) { { name: 'Test Example', description: 'This is a test example' } }
        run_test!
      end
    end
  end
  
  path '/api/v1/examples/{id}' do
    parameter name: :id, in: :path, type: :integer
    
    get 'Retrieves an example' do
      tags 'Examples'
      produces 'application/json'
      
      response '200', 'example found' do
        schema type: :object,
          properties: {
            id: { type: :integer },
            name: { type: :string },
            description: { type: :string }
          },
          required: ['id', 'name', 'description']
          
        let(:id) { 1 }
        run_test!
      end
    end
    
    put 'Updates an example' do
      tags 'Examples'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :example, in: :body, schema: {
        type: :object,
        properties: {
          name: { type: :string },
          description: { type: :string }
        },
        required: ['name', 'description']
      }
      
      response '200', 'example updated' do
        let(:id) { 1 }
        let(:example) { { name: 'Updated Example', description: 'This is an updated example' } }
        run_test!
      end
    end
    
    delete 'Deletes an example' do
      tags 'Examples'
      produces 'application/json'
      
      response '200', 'example deleted' do
        schema type: :object,
          properties: {
            message: { type: :string }
          },
          required: ['message']
          
        let(:id) { 1 }
        run_test!
      end
    end
  end
end 