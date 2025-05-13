require 'swagger_helper'

RSpec.describe 'Api::V1::RuleGroups', type: :request do
  let(:rule_group) { create(:rule_group) }
  let(:rule) { create(:rule) }

  path '/api/v1/rule_groups' do
    get 'Lists all rule groups' do
      tags 'Rule Groups'
      produces 'application/json'
      
      response '200', 'rule groups found' do
        schema type: 'object',
          properties: {
            rule_groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  rules: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        description: { type: 'string' }
                      }
                    }
                  },
                  created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
                },
                required: %w[id name description rules]
              }
            }
          },
          required: ['rule_groups']

        run_test!
      end
    end

    post 'Creates a rule group' do
      tags 'Rule Groups'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :rule_group, in: :body, schema: {
        type: :object,
        properties: {
          rule_group: {
            type: :object,
            properties: {
              name: { type: :string },
              description: { type: :string },
              rule_ids: { 
                type: :array,
                items: { type: :integer }
              }
            },
            required: %w[name description]
          }
        }
      }

      response '201', 'rule group created' do
        let(:rule_group) { { rule_group: { name: 'Angular Best Practices', description: 'Recommended rules for Angular projects' } } }
        run_test!
      end

      response '422', 'invalid request' do
        let(:rule_group) { { rule_group: { name: nil } } }
        run_test!
      end
    end
  end

  path '/api/v1/rule_groups/{id}' do
    parameter name: :id, in: :path, type: :integer

    get 'Retrieves a rule group' do
      tags 'Rule Groups'
      produces 'application/json'

      response '200', 'rule group found' do
        schema type: :object,
          properties: {
            id: { type: :integer },
            name: { type: :string },
            description: { type: :string },
            rules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }

        let(:id) { rule_group.id }
        run_test!
      end

      response '404', 'rule group not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end

    patch 'Updates a rule group' do
      tags 'Rule Groups'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :rule_group, in: :body, schema: {
        type: :object,
        properties: {
          rule_group: {
            type: :object,
            properties: {
              name: { type: :string },
              description: { type: :string }
            }
          }
        }
      }

      response '200', 'rule group updated' do
        let(:id) { rule_group.id }
        let(:rule_group_params) { { rule_group: { name: 'Updated Group' } } }
        run_test!
      end

      response '404', 'rule group not found' do
        let(:id) { 'invalid' }
        let(:rule_group_params) { { rule_group: { name: 'Updated Group' } } }
        run_test!
      end
    end

    delete 'Deletes a rule group' do
      tags 'Rule Groups'
      
      response '204', 'rule group deleted' do
        let(:id) { rule_group.id }
        run_test!
      end
    end
  end

  path '/api/v1/rule_groups/{id}/add_rules' do
    parameter name: :id, in: :path, type: :integer

    post 'Adds rules to a group' do
      tags 'Rule Groups'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :rules, in: :body, schema: {
        type: :object,
        properties: {
          rule_ids: {
            type: :array,
            items: { type: :integer }
          }
        },
        required: ['rule_ids']
      }

      response '200', 'rules added' do
        let(:id) { rule_group.id }
        let(:rules) { { rule_ids: [rule.id] } }
        run_test!
      end

      response '404', 'rule group not found' do
        let(:id) { 'invalid' }
        let(:rules) { { rule_ids: [rule.id] } }
        run_test!
      end
    end
  end

  path '/api/v1/rule_groups/{id}/rules/{rule_id}' do
    parameter name: :id, in: :path, type: :integer
    parameter name: :rule_id, in: :path, type: :integer

    delete 'Removes a rule from a group' do
      tags 'Rule Groups'

      response '200', 'rule removed' do
        let(:id) { rule_group.id }
        let(:rule_id) { rule.id }
        run_test!
      end

      response '404', 'rule group or rule not found' do
        let(:id) { rule_group.id }
        let(:rule_id) { 'invalid' }
        run_test!
      end
    end
  end
end
