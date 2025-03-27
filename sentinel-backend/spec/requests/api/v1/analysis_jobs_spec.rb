require 'swagger_helper'

RSpec.describe 'Api::V1::AnalysisJobs', type: :request do
  path '/api/v1/analysis_jobs' do
    get 'Lists all analysis jobs' do
      tags 'Analysis Jobs'
      produces 'application/json'
      parameter name: :page, in: :query, type: :integer, required: false, description: 'Page number'
      parameter name: :per_page, in: :query, type: :integer, required: false, description: 'Items per page'
      
      response '200', 'analysis jobs found' do
        let!(:analysis_job) { create(:analysis_job, :completed) }
        
        schema type: 'object',
          required: ['data', 'meta'],
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'status', 'created_at', 'updated_at'],
                properties: {
                  id: { type: 'integer' },
                  status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  files_with_violations: {
                    type: 'array',
                    items: { 
                      type: 'object',
                      required: ['id', 'file_path'],
                      properties: {
                        id: { type: 'integer' },
                        file_path: { type: 'string' }
                      }
                    }
                  },
                  pattern_matches: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['id', 'rule_id', 'rule_name'],
                      properties: {
                        id: { type: 'integer' },
                        rule_id: { type: 'string' },
                        rule_name: { type: 'string' },
                        line_number: { type: 'integer' },
                        column: { type: 'integer' },
                        match_text: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              required: ['total_count', 'page', 'per_page'],
              properties: {
                total_count: { type: 'integer' },
                page: { type: 'integer' },
                per_page: { type: 'integer' }
              }
            }
          }
          
        before do
          get '/api/v1/analysis_jobs'
          puts "Response body: #{response.body}"
          
          # Validate response structure matches exactly
          json = JSON.parse(response.body)
          expect(json.keys.sort).to eq(['data', 'meta'])
          expect(json['data'].first.keys.sort).to eq(['id', 'status', 'created_at', 'updated_at', 'files_with_violations', 'pattern_matches'].sort)
        end
        
        run_test!
      end
    end
    
    post 'Creates an analysis job' do
      tags 'Analysis Jobs'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :analysis_job, in: :body, schema: {
        type: 'object',
        properties: {
          project_id: { type: 'integer' }
        },
        required: ['project_id']
      }
      
      response '201', 'analysis job created' do
        let(:analysis_job) { { project_id: create(:project).id } }
        run_test!
      end
      
      response '422', 'invalid request' do
        let(:analysis_job) { { project_id: 'invalid' } }
        run_test!
      end
    end
  end
  
  path '/api/v1/analysis_jobs/{id}' do
    parameter name: :id, in: :path, type: :integer
    
    get 'Retrieves an analysis job' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'analysis job found' do
        schema type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
                files_with_violations: {
                  type: 'array',
                  items: { 
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      file_path: { type: 'string' }
                    }
                  }
                },
                pattern_matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      rule_id: { type: 'string' },
                      rule_name: { type: 'string' },
                      line_number: { type: 'integer' },
                      column: { type: 'integer' },
                      match_text: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
          
        let(:id) { create(:analysis_job).id }
        run_test!
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end
  end
  
  path '/api/v1/analysis_jobs/{id}/fetch_results' do
    parameter name: :id, in: :path, type: :integer
    parameter name: :use_service, in: :query, type: :boolean, required: false, description: 'Whether to use the analysis service'
    
    get 'Fetches analysis job results' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'analysis job results fetched' do
        schema type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
                files_with_violations: {
                  type: 'array',
                  items: { 
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      file_path: { type: 'string' }
                    }
                  }
                },
                pattern_matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      rule_id: { type: 'string' },
                      rule_name: { type: 'string' },
                      line_number: { type: 'integer' },
                      column: { type: 'integer' },
                      match_text: { type: 'string' }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                detailed: { type: 'boolean' }
              }
            }
          }
          
        let(:id) { create(:analysis_job).id }
        run_test!
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 'invalid' }
        run_test!
      end
      
      response '503', 'service unavailable' do
        let(:id) { create(:analysis_job).id }
        let(:use_service) { 'true' }
        # Mock the service to return nil for testing the service unavailable response
        run_test!
      end
    end
  end
  
  path '/api/v1/analysis_jobs/{id}/process_results' do
    parameter name: :id, in: :path, type: :integer
    
    post 'Processes analysis job results' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'processing scheduled' do
        schema type: 'object',
          properties: {
            message: { type: 'string' }
          }
          
        let(:id) { create(:analysis_job).id }
        run_test!
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end
  end
end 