require 'swagger_helper'

RSpec.describe 'Api::V1::AnalysisJobs', type: :request do
  path '/api/v1/analysis_jobs' do
    get 'Lists all analysis jobs' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'analysis jobs found' do
        schema type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  project_id: { type: 'integer' },
                  status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                  total_files: { type: 'integer' },
                  total_matches: { type: 'integer' },
                  rules_matched: { type: 'integer' },
                  completed_at: { type: 'string', format: 'date-time' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  duration: { type: 'integer' },
                  files_processed: { type: 'integer' },
                  files_per_second_wall_time: { type: 'number' },
                  cumulative_processing_time_ms: { type: 'integer' },
                  avg_time_per_file_ms: { type: 'number' },
                  files_per_second_cpu_time: { type: 'number' },
                  parallel_cores_used: { type: 'integer' },
                  parallel_speedup_factor: { type: 'number' },
                  parallel_efficiency_percent: { type: 'number' },
                  project: { 
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      repository_url: { type: 'string' },
                      created_at: { type: 'string', format: 'date-time' },
                      updated_at: { type: 'string', format: 'date-time' }
                    },
                    required: ['id', 'name', 'repository_url', 'created_at', 'updated_at']
                  }
                },
                required: [
                  'id', 'project_id', 'status', 'total_files', 'total_matches', 'rules_matched',
                  'completed_at', 'created_at', 'updated_at', 'duration',
                  'files_processed', 'files_per_second_wall_time', 'cumulative_processing_time_ms',
                  'avg_time_per_file_ms', 'files_per_second_cpu_time', 'parallel_cores_used',
                  'parallel_speedup_factor', 'parallel_efficiency_percent', 'project'
                ]
              }
            },
            meta: {
              type: 'object',
              properties: {
                current_page: { type: 'integer' },
                total_pages: { type: 'integer' },
                total_count: { type: 'integer' }
              }
            }
          },
          required: ['data', 'meta']

        let(:project) { create(:project) }
        let!(:analysis_jobs) { create_list(:analysis_job, 5, :completed, project: project) }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_an(Array)
          expect(data['data'].length).to eq(5)
          
          completed_job = data['data'].first
          expect(completed_job).to include(
            'total_files',
            'total_matches',
            'rules_matched',
            'completed_at',
            'duration',
            'files_processed',
            'files_per_second_wall_time',
            'cumulative_processing_time_ms',
            'avg_time_per_file_ms',
            'files_per_second_cpu_time',
            'parallel_cores_used',
            'parallel_speedup_factor',
            'parallel_efficiency_percent',
            'project'
          )
          
          # Verify project association is included and correct
          expect(completed_job['project']).to be_a(Hash)
          expect(completed_job['project']['id']).to eq(project.id)
          expect(completed_job['project']['name']).to eq(project.name)
        end
      end
    end

    post 'Creates an analysis job' do
      tags 'Analysis Jobs'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :analysis_job, in: :body, schema: {
        type: :object,
        properties: {
          project_id: { type: :integer }
        },
        required: ['project_id']
      }

      response '201', 'analysis job created' do
        schema type: :object,
          properties: {
            data: {
              type: :object,
              properties: {
                id: { type: :integer },
                project_id: { type: :integer },
                status: { type: :string, enum: ['pending', 'running', 'completed', 'failed'] },
                total_files: { type: :integer },
                total_matches: { type: :integer },
                rules_matched: { type: :integer },
                completed_at: { type: :string, format: 'date-time' },
                created_at: { type: :string, format: 'date-time' },
                updated_at: { type: :string, format: 'date-time' },
                duration: { type: :integer },
                files_processed: { type: :integer },
                files_per_second_wall_time: { type: :number },
                cumulative_processing_time_ms: { type: :integer },
                avg_time_per_file_ms: { type: :number },
                files_per_second_cpu_time: { type: :number },
                parallel_cores_used: { type: :integer },
                parallel_speedup_factor: { type: :number },
                parallel_efficiency_percent: { type: :number },
                project: { 
                  type: :object,
                  properties: {
                    id: { type: :integer },
                    name: { type: :string },
                    repository_url: { type: :string },
                    created_at: { type: :string, format: 'date-time' },
                    updated_at: { type: :string, format: 'date-time' }
                  },
                  required: ['id', 'name', 'repository_url', 'created_at', 'updated_at']
                }
              },
              required: [
                'id', 'project_id', 'status', 'total_files', 'total_matches', 'rules_matched',
                'completed_at', 'created_at', 'updated_at', 'duration',
                'files_processed', 'files_per_second_wall_time', 'cumulative_processing_time_ms',
                'avg_time_per_file_ms', 'files_per_second_cpu_time', 'parallel_cores_used',
                'parallel_speedup_factor', 'parallel_efficiency_percent', 'project'
              ]
            }
          },
          required: ['data']

        let(:project) { create(:project) }
        let(:analysis_job) { { project_id: project.id } }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to include('id', 'project_id', 'status', 'project')
          # Verify project association is included and correct
          expect(data['data']['project']).to be_a(Hash)
          expect(data['data']['project']['id']).to eq(project.id)
          expect(data['data']['project']['name']).to eq(project.name)
        end
      end

      response '422', 'invalid request' do
        let(:analysis_job) { { project_id: 0 } }

        run_test! do |response|
          expect(response).to have_http_status(:unprocessable_entity)
        end
      end
    end
  end

  path '/api/v1/analysis_jobs/{id}' do
    parameter name: :id, in: :path, type: :integer
    
    get 'Retrieves an analysis job' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'analysis job found' do
        schema type: :object,
          properties: {
            data: {
              type: :object,
              properties: {
                id: { type: :integer },
                project_id: { type: :integer },
                status: { type: :string, enum: ['pending', 'running', 'completed', 'failed'] },
                total_files: { type: :integer },
                total_matches: { type: :integer },
                rules_matched: { type: :integer },
                completed_at: { type: :string, format: 'date-time' },
                created_at: { type: :string, format: 'date-time' },
                updated_at: { type: :string, format: 'date-time' },
                duration: { type: :integer },
                files_processed: { type: :integer },
                files_per_second_wall_time: { type: :number },
                cumulative_processing_time_ms: { type: :integer },
                avg_time_per_file_ms: { type: :number },
                files_per_second_cpu_time: { type: :number },
                parallel_cores_used: { type: :integer },
                parallel_speedup_factor: { type: :number },
                parallel_efficiency_percent: { type: :number },
                project: { 
                  type: :object,
                  properties: {
                    id: { type: :integer },
                    name: { type: :string },
                    repository_url: { type: :string },
                    created_at: { type: :string, format: 'date-time' },
                    updated_at: { type: :string, format: 'date-time' }
                  },
                  required: ['id', 'name', 'repository_url', 'created_at', 'updated_at']
                }
              },
              required: [
                'id', 'project_id', 'status', 'total_files', 'total_matches', 'rules_matched',
                'completed_at', 'created_at', 'updated_at', 'duration',
                'files_processed', 'files_per_second_wall_time', 'cumulative_processing_time_ms',
                'avg_time_per_file_ms', 'files_per_second_cpu_time', 'parallel_cores_used',
                'parallel_speedup_factor', 'parallel_efficiency_percent', 'project'
              ]
            }
          },
          required: ['data']
          
        let(:project) { create(:project) }
        let(:analysis_job) { create(:analysis_job, :completed, project: project) }
        let(:id) { analysis_job.id }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_a(Hash)
          expect(data['data']['id']).to eq(analysis_job.id)
          expect(data['data']).to include(
            'total_files',
            'total_matches',
            'rules_matched',
            'completed_at',
            'duration',
            'files_processed',
            'files_per_second_wall_time',
            'cumulative_processing_time_ms',
            'avg_time_per_file_ms',
            'files_per_second_cpu_time',
            'parallel_cores_used',
            'parallel_speedup_factor',
            'parallel_efficiency_percent',
            'project'
          )
          
          # Verify project association is included and correct
          expect(data['data']['project']).to be_a(Hash)
          expect(data['data']['project']['id']).to eq(project.id)
          expect(data['data']['project']['name']).to eq(project.name)
        end
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 0 }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('error')
        end
      end
    end
  end

  path '/api/v1/analysis_jobs/{id}/fetch_results' do
    parameter name: :id, in: :path, type: :integer
    
    get 'Fetches analysis job results' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'analysis job results found' do
        schema type: :object,
          properties: {
            data: {
              type: :object,
              properties: {
                id: { type: :integer },
                project_id: { type: :integer },
                status: { type: :string, enum: ['pending', 'running', 'completed', 'failed'] },
                total_files: { type: :integer },
                total_matches: { type: :integer },
                rules_matched: { type: :integer },
                completed_at: { type: :string, format: 'date-time' },
                created_at: { type: :string, format: 'date-time' },
                updated_at: { type: :string, format: 'date-time' },
                duration: { type: :integer },
                files_processed: { type: :integer },
                files_per_second_wall_time: { type: :number },
                cumulative_processing_time_ms: { type: :integer },
                avg_time_per_file_ms: { type: :number },
                files_per_second_cpu_time: { type: :number },
                parallel_cores_used: { type: :integer },
                parallel_speedup_factor: { type: :number },
                parallel_efficiency_percent: { type: :number },
                project: { 
                  type: :object,
                  properties: {
                    id: { type: :integer },
                    name: { type: :string },
                    repository_url: { type: :string },
                    created_at: { type: :string, format: 'date-time' },
                    updated_at: { type: :string, format: 'date-time' }
                  },
                  required: ['id', 'name', 'repository_url', 'created_at', 'updated_at']
                }
              },
              required: [
                'id', 'project_id', 'status', 'total_files', 'total_matches', 'rules_matched',
                'completed_at', 'created_at', 'updated_at', 'duration',
                'files_processed', 'files_per_second_wall_time', 'cumulative_processing_time_ms',
                'avg_time_per_file_ms', 'files_per_second_cpu_time', 'parallel_cores_used',
                'parallel_speedup_factor', 'parallel_efficiency_percent', 'project'
              ]
            }
          },
          required: ['data']
          
        let(:project) { create(:project) }
        let(:analysis_job) { create(:analysis_job, :completed, project: project) }
        let(:id) { analysis_job.id }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_a(Hash)
          expect(data['data']['id']).to eq(analysis_job.id)
          expect(data['data']).to include(
            'total_files',
            'total_matches',
            'rules_matched',
            'completed_at',
            'duration',
            'files_processed',
            'files_per_second_wall_time',
            'cumulative_processing_time_ms',
            'avg_time_per_file_ms',
            'files_per_second_cpu_time',
            'parallel_cores_used',
            'parallel_speedup_factor',
            'parallel_efficiency_percent',
            'project'
          )
          
          # Verify project association is included and correct
          expect(data['data']['project']).to be_a(Hash)
          expect(data['data']['project']['id']).to eq(project.id)
          expect(data['data']['project']['name']).to eq(project.name)
        end
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 0 }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('error')
        end
      end

      response '503', 'service unavailable' do
        let(:project) { create(:project) }
        let(:analysis_job) { create(:analysis_job, :completed, project: project) }
        let(:id) { analysis_job.id }
        
        before do
          # Force the controller to raise an error when fetching results
          allow_any_instance_of(AnalysisJob).to receive(:reload).and_raise(StandardError.new("Service unavailable"))
        end
        
        run_test! do |response|
          expect(response).to have_http_status(:service_unavailable)
        end
      end
    end
  end

  path '/api/v1/analysis_jobs/{id}/process_results' do
    parameter name: :id, in: :path, type: :integer
    
    post 'Processes analysis job results' do
      tags 'Analysis Jobs'
      produces 'application/json'
      
      response '200', 'results processing scheduled' do
        schema type: :object,
          properties: {
            message: { type: :string }
          },
          required: ['message']
          
        let(:project) { create(:project) }
        let(:analysis_job) { create(:analysis_job, :completed, project: project) }
        let(:id) { analysis_job.id }
        
        before do
          # Mock the AnalysisService to avoid actual service calls
          allow_any_instance_of(AnalysisService).to receive(:process_results).and_return(true)
        end
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['message']).to eq('Analysis results processing has been scheduled')
        end
      end
      
      response '404', 'analysis job not found' do
        let(:id) { 0 }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('error')
        end
      end
    end
  end
end 