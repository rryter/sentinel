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
                  total_files: { type: 'integer', nullable: true },
                  total_matches: { type: 'integer', nullable: true },
                  rules_matched: { type: 'integer', nullable: true },
                  completed_at: { type: 'string', format: 'date-time', nullable: true },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  processing_duration: { type: 'integer', nullable: true }
                },
                required: ['id', 'project_id', 'status']
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
            'processing_duration'
          )
          
          # Verify processing_duration is calculated correctly
          if completed_job['completed_at'].present?
            created_at = Time.parse(completed_job['created_at'])
            completed_at = Time.parse(completed_job['completed_at'])
            expected_duration = (completed_at - created_at).to_i
            expect(completed_job['processing_duration']).to eq(expected_duration)
          end
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
                total_files: { type: :integer, nullable: true },
                total_matches: { type: :integer, nullable: true },
                rules_matched: { type: :integer, nullable: true },
                completed_at: { type: :string, format: 'date-time', nullable: true },
                created_at: { type: :string, format: 'date-time' },
                updated_at: { type: :string, format: 'date-time' },
                processing_duration: { type: :integer, nullable: true }
              },
              required: ['id', 'project_id', 'status']
            }
          },
          required: ['data']

        let(:project) { create(:project) }
        let(:analysis_job) { { project_id: project.id } }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to include('id', 'project_id', 'status')
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
                total_files: { type: :integer, nullable: true },
                total_matches: { type: :integer, nullable: true },
                rules_matched: { type: :integer, nullable: true },
                completed_at: { type: :string, format: 'date-time', nullable: true },
                created_at: { type: :string, format: 'date-time' },
                updated_at: { type: :string, format: 'date-time' },
                processing_duration: { type: :integer, nullable: true }
              },
              required: ['id', 'project_id', 'status']
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
            'processing_duration'
          )
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
                total_files: { type: :integer, nullable: true },
                total_matches: { type: :integer, nullable: true },
                rules_matched: { type: :integer, nullable: true },
                completed_at: { type: :string, format: 'date-time', nullable: true },
                created_at: { type: :string, format: 'date-time' },
                updated_at: { type: :string, format: 'date-time' },
                processing_duration: { type: :integer, nullable: true }
              },
              required: ['id', 'project_id', 'status']
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
            'processing_duration'
          )
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
          allow_any_instance_of(AnalysisJob).to receive(:fetch_results).and_raise(StandardError)
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