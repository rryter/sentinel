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
        
        schema type: :object,
          required: ['data', 'meta'],
          properties: {
            data: {
              type: :array,
              items: {
                type: :object,
                required: ['id', 'status', 'created_at', 'updated_at'],
                properties: {
                  id: { type: :integer },
                  status: { type: :string, enum: ['pending', 'running', 'completed', 'failed'] },
                  created_at: { type: :string, format: 'date-time' },
                  updated_at: { type: :string, format: 'date-time' },
                  files_with_violations: {
                    type: :array,
                    items: { 
                      type: :object,
                      required: ['id', 'file_path'],
                      properties: {
                        id: { type: :integer },
                        file_path: { type: :string }
                      }
                    }
                  },
                  pattern_matches: {
                    type: :array,
                    items: {
                      type: :object,
                      required: ['id', 'rule_name', 'start_line', 'end_line'],
                      properties: {
                        id: { type: :integer },
                        rule_name: { type: :string },
                        start_line: { type: :integer },
                        end_line: { type: :integer },
                        start_col: { type: :integer },
                        end_col: { type: :integer },
                        match_text: { type: :string }
                      }
                    }
                  }
                }
              }
            },
            meta: {
              type: :object,
              required: ['total_count', 'page', 'per_page'],
              properties: {
                total_count: { type: :integer },
                page: { type: :integer },
                per_page: { type: :integer }
              }
            }
          }
          
        before do
          get '/api/v1/analysis_jobs'
        end
        
        run_test!
      end
    end
    
    post 'Creates an analysis job' do
      tags 'Analysis Jobs'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :api_v1_analysis_jobs_post_request, in: :body, schema: {
        type: :object,
        properties: {
          project_id: { type: :integer }
        },
        required: ['project_id']
      }
      
      response '201', 'analysis job created' do
        let(:project) { create(:project) }
        let(:api_v1_analysis_jobs_post_request) { { project_id: project.id } }
        
        schema '$ref' => '#/components/schemas/AnalysisJobResponse'
        
        before do
          allow(AnalysisWorker).to receive(:perform_async)
          allow(AnalysisStatusPollerWorker).to receive(:perform_in)
          post '/api/v1/analysis_jobs', params: api_v1_analysis_jobs_post_request
          puts "Response body: #{response.body}"
        end
        
        run_test!
      end
      
      response '422', 'invalid request' do
        let(:api_v1_analysis_jobs_post_request) { { project_id: 'invalid' } }
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
        schema '$ref' => '#/components/schemas/AnalysisJobResponse'
          
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
        schema '$ref' => '#/components/schemas/AnalysisJobResponse'
          
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
        schema type: :object,
          properties: {
            message: { type: :string }
          },
          required: ['message']
          
        let(:id) { create(:analysis_job).id }
        
        before do
          allow(AnalysisResultsProcessorWorker).to receive(:perform_async)
          post "/api/v1/analysis_jobs/#{id}/process_results"
          puts "Response body: #{response.body}"
        end
        
        run_test!
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 'invalid' }
        run_test!
      end
    end
  end
end 