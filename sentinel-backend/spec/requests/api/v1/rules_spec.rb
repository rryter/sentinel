require 'swagger_helper'

RSpec.describe 'Api::V1::Rules', type: :request do
  let!(:severity) { create(:severity) }
  let!(:existing_rule) { create(:rule) }
  let(:rule_id) { existing_rule.id }
  let(:valid_rule_params) { { rule: { name: 'No Console', description: 'Prevents usage of console.log', severity_id: severity.id } } }
  let(:invalid_rule_params) { { rule: { name: nil } } }

  path '/api/v1/rules' do
    get 'Lists all rules' do
      tags 'Rules'
      produces 'application/json'
      
      response '200', 'rules found' do
        schema type: 'object',
          properties: {
            rules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                },
                required: %w[id name description]
              }
            }
          },
          required: ['rules']

        run_test!
      end
    end

    post 'Creates a rule' do
      tags 'Rules'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :rule, in: :body, schema: {
        type: :object,
        properties: {
          rule: {
            type: :object,
            properties: {
              name: { type: :string },
              description: { type: :string },
              severity_id: { type: :integer }
            },
            required: %w[name description severity_id]
          }
        }
      }

      response '201', 'rule created' do
        let(:rule) { valid_rule_params }
        run_test!
      end

      response '422', 'invalid request' do
        let(:rule) { invalid_rule_params }
        run_test!
      end
    end
  end

  path '/api/v1/rules/{id}' do
    parameter name: :id, in: :path, type: :integer

    get 'Retrieves a rule' do
      tags 'Rules'
      produces 'application/json'

      response '200', 'rule found' do
        schema type: :object,
          properties: {
            id: { type: :integer },
            name: { type: :string },
            description: { type: :string },
            created_at: { type: :string, format: 'date-time' },
            updated_at: { type: :string, format: 'date-time' }
          }

        let(:id) { rule_id }
        run_test!
      end

      response '404', 'rule not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end

    patch 'Updates a rule' do
      tags 'Rules'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :rule, in: :body, schema: {
        type: :object,
        properties: {
          rule: {
            type: :object,
            properties: {
              name: { type: :string },
              description: { type: :string }
            }
          }
        }
      }

      response '200', 'rule updated' do
        let(:id) { rule_id }
        let(:rule) { { rule: { name: 'Updated Rule' } } }
        run_test!
      end

      response '404', 'rule not found' do
        let(:id) { 'invalid' }
        let(:rule) { { rule: { name: 'Updated Rule' } } }
        run_test!
      end
    end

    delete 'Deletes a rule' do
      tags 'Rules'
      
      response '204', 'rule deleted' do
        let(:id) { rule_id }
        run_test!
      end
    end
  end
end
