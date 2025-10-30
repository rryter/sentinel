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
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  duration: { type: 'integer' },
                  files_per_second_wall_time: { type: 'number' },
                  cumulative_processing_time_ms: { type: 'integer' },
                  avg_time_per_file_ms: { type: 'number' },
                  files_per_second_cpu_time: { type: 'number' },
                  parallel_cores_used: { type: 'integer' },
                  parallel_speedup_factor: { type: 'number' },
                  parallel_efficiency_percent: { type: 'number' },
                  error_message: { type: 'string', nullable: true },
                  rules_statistics: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        rule: { type: 'string' },
                        count: { type: 'integer' }
                      },
                      required: ['rule', 'count']
                    }
                  },
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
                  'created_at', 'updated_at', 'duration',
                  'files_per_second_wall_time', 'cumulative_processing_time_ms',
                  'avg_time_per_file_ms', 'files_per_second_cpu_time', 'parallel_cores_used',
                  'parallel_speedup_factor', 'parallel_efficiency_percent', 'rules_statistics', 'project'
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
            'duration',
            'files_per_second_wall_time',
            'cumulative_processing_time_ms',
            'avg_time_per_file_ms',
            'files_per_second_cpu_time',
            'parallel_cores_used',
            'parallel_speedup_factor',
            'parallel_efficiency_percent',
            'rules_statistics',
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
                created_at: { type: :string, format: 'date-time' },
                updated_at: { type: :string, format: 'date-time' },
                duration: { type: :integer },
                files_per_second_wall_time: { type: :number },
                cumulative_processing_time_ms: { type: :integer },
                avg_time_per_file_ms: { type: :number },
                files_per_second_cpu_time: { type: :number },
                parallel_cores_used: { type: :integer },
                parallel_speedup_factor: { type: :number },
                parallel_efficiency_percent: { type: :number },
                error_message: { type: :string, nullable: true },
                rules_statistics: {
                  type: :array,
                  items: {
                    type: :object,
                    properties: {
                      rule: { type: :string },
                      count: { type: :integer }
                    },
                    required: ['rule', 'count']
                  }
                },
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
                'created_at', 'updated_at', 'duration',
                'files_per_second_wall_time', 'cumulative_processing_time_ms',
                'avg_time_per_file_ms', 'files_per_second_cpu_time', 'parallel_cores_used',
                'parallel_speedup_factor', 'parallel_efficiency_percent', 'rules_statistics', 'project'
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
                created_at: { type: :string, format: 'date-time' },
                updated_at: { type: :string, format: 'date-time' },
                duration: { type: :integer },
                files_per_second_wall_time: { type: :number },
                cumulative_processing_time_ms: { type: :integer },
                avg_time_per_file_ms: { type: :number },
                files_per_second_cpu_time: { type: :number },
                parallel_cores_used: { type: :integer },
                parallel_speedup_factor: { type: :number },
                parallel_efficiency_percent: { type: :number },
                error_message: { type: :string, nullable: true },
                rules_statistics: {
                  type: :array,
                  items: {
                    type: :object,
                    properties: {
                      rule: { type: :string },
                      count: { type: :integer }
                    },
                    required: ['rule', 'count']
                  }
                },
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
                'created_at', 'updated_at', 'duration',
                'files_per_second_wall_time', 'cumulative_processing_time_ms',
                'avg_time_per_file_ms', 'files_per_second_cpu_time', 'parallel_cores_used',
                'parallel_speedup_factor', 'parallel_efficiency_percent', 'rules_statistics', 'project'
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
            'duration',
            'files_per_second_wall_time',
            'cumulative_processing_time_ms',
            'avg_time_per_file_ms',
            'files_per_second_cpu_time',
            'parallel_cores_used',
            'parallel_speedup_factor',
            'parallel_efficiency_percent',
            'rules_statistics',
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

  path '/api/v1/analysis_jobs/rule_history' do
    get 'Gets historical rule violation data' do
      tags 'Analysis Jobs'
      produces 'application/json'
      parameter name: :project_id, in: :query, type: :integer, required: true, description: 'Project ID to get history for'
      parameter name: :limit, in: :query, type: :integer, required: false, description: 'Number of jobs to retrieve (default: 10)'

      response '200', 'rule history retrieved' do
        schema type: :object,
          properties: {
            data: {
              type: :array,
              items: {
                type: :object,
                properties: {
                  job_id: { type: :integer },
                  created_at: { type: :string, format: 'date-time' },
                  completed_at: { type: :string, format: 'date-time' },
                  total_files: { type: :integer },
                  total_violations: { type: :integer },
                  rules: {
                    type: :array,
                    items: {
                      type: :object,
                      properties: {
                        rule_name: { type: :string },
                        violations_count: { type: :integer }
                      },
                      required: ['rule_name', 'violations_count']
                    }
                  }
                },
                required: ['job_id', 'created_at', 'completed_at', 'total_files', 'total_violations', 'rules']
              }
            },
            meta: {
              type: :object,
              properties: {
                project_id: { type: :integer },
                total_jobs: { type: :integer }
              },
              required: ['project_id', 'total_jobs']
            }
          },
          required: ['data', 'meta']

        let(:project) { create(:project) }
        let(:project_id) { project.id }
        let!(:jobs) { create_list(:analysis_job, 3, :completed, project: project, total_matches: 5) }

        before do
          # Create violations for each job with different rule names
          # Use different line numbers to avoid unique constraint violation
          jobs.each_with_index do |job, idx|
            file = create(:file_with_violations, analysis_job: job)
            # Create violations with unique line numbers
            3.times do |i|
              create(:violation, file_with_violations: file, rule_name: 'no-debugger', start_line: i + 1, end_line: i + 1)
            end
            if idx.even?
              2.times do |i|
                create(:violation, file_with_violations: file, rule_name: 'no-console', start_line: i + 10, end_line: i + 10)
              end
            end
          end
        end

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_an(Array)
          expect(data['data'].length).to eq(3)
          expect(data['meta']['project_id']).to eq(project.id)
          expect(data['meta']['total_jobs']).to eq(3)

          # Check first job has rule data
          first_job = data['data'].first
          expect(first_job).to include('job_id', 'created_at', 'completed_at', 'total_files', 'total_violations', 'rules')
          expect(first_job['rules']).to be_an(Array)
          expect(first_job['rules'].first).to include('rule_name', 'violations_count')
        end
      end

      response '400', 'missing project_id parameter' do
        let(:project_id) { nil }

        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data).to have_key('error')
          expect(data['error']).to eq('project_id parameter is required')
        end
      end
    end
  end
end 