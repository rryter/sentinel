require 'swagger_helper'

RSpec.describe 'Api::V1::ProjectRules', type: :request do
  let(:project) { create(:project) }
  let(:rule) { create(:rule) }
  let(:project_rule) { create(:project_rule, project: project, rule: rule) }

  path '/api/v1/projects/{project_id}/rules' do
    parameter name: :project_id, in: :path, type: :integer

    get 'Lists all rules for a project' do
      tags 'Project Rules'
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
                  enabled: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                },
                required: %w[id name description enabled]
              }
            }
          },
          required: ['rules']

        let(:project_id) { project.id }
        run_test!
      end

      response '404', 'project not found' do
        let(:project_id) { 'invalid' }
        run_test!
      end
    end
  end

  path '/api/v1/projects/{project_id}/rules/{id}' do
    parameter name: :project_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    patch 'Updates a rule\'s status for a project' do
      tags 'Project Rules'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :rule_params, in: :body, schema: {
        type: :object,
        properties: {
          rule: {
            type: :object,
            properties: {
              enabled: { type: :boolean }
            },
            required: ['enabled']
          }
        }
      }

      response '200', 'rule status updated' do
        let(:project_id) { project.id }
        let(:id) { rule.id }
        let(:rule_params) { { rule: { enabled: true } } }
        run_test!
      end

      response '404', 'project or rule not found' do
        let(:project_id) { project.id }
        let(:id) { 'invalid' }
        let(:rule_params) { { rule: { enabled: true } } }
        run_test!
      end
    end

    post 'toggle' do
      tags 'Project Rules'
      produces 'application/json'
      operationId 'toggleRule'
      parameter name: :project_id, in: :path, type: :integer
      parameter name: :id, in: :path, type: :integer

      response '200', 'rule status toggled' do
        let(:project_id) { project.id }
        let(:id) { rule.id }
        run_test!
      end

      response '404', 'project or rule not found' do
        let(:project_id) { project.id }
        let(:id) { 'invalid' }
        run_test!
      end
    end
  end
end
