require 'swagger_helper'

RSpec.describe 'Api::V1::FilesWithViolations', type: :request do
  path '/api/v1/files_with_violations' do
    parameter name: :page, in: :query, type: :integer, required: false, description: 'Page number'
    parameter name: :per_page, in: :query, type: :integer, required: false, description: 'Items per page'
    parameter name: :analysis_job_id, in: :query, type: :integer, required: false, description: 'Filter by analysis job ID'
    parameter name: :file_path, in: :query, type: :string, required: false, description: 'Filter by file path pattern'
    parameter name: :sort, in: :query, type: :string, required: false, description: 'Sort field (file_path, analysis_job_id, violation_count)'
    parameter name: :direction, in: :query, type: :string, required: false, description: 'Sort direction (asc, desc)'
    
    get 'Lists files with violations' do
      tags 'Files With Violations'
      produces 'application/json'
      
      response '200', 'files with violations found' do
        schema type: :object,
          properties: {
            data: { 
              type: :array,
              items: {
                type: :object,
                properties: {
                  id: { type: :integer },
                  file_path: { type: :string },
                  analysis_job_id: { type: :integer },
                  display_path: { type: :string },
                  job_status: { type: :string, enum: ['pending', 'running', 'completed', 'failed'] }
                }
              }
            },
            meta: {
              type: :object,
              properties: {
                total_count: { type: :integer },
                current_page: { type: :integer },
                total_pages: { type: :integer },
                sort: { type: :string },
                direction: { type: :string }
              }
            }
          }

        let!(:analysis_job) { create(:analysis_job) }
        let!(:file_with_violations) { create(:file_with_violations, analysis_job: analysis_job) }
        
        run_test! do |response|
          data = JSON.parse(response.body)
          expect(data['data']).to be_an(Array)
          expect(data['meta']).to include(
            'total_count',
            'current_page',
            'total_pages',
            'sort',
            'direction'
          )
        end

        context 'with filtering' do
          let!(:another_job) { create(:analysis_job) }
          let!(:another_file) { create(:file_with_violations, analysis_job: another_job, file_path: 'spec/models/user_spec.rb') }
          
          it 'filters by analysis_job_id' do
            get "/api/v1/files_with_violations", params: { analysis_job_id: analysis_job.id }
            data = JSON.parse(response.body)
            expect(data['data'].length).to eq(1)
            expect(data['data'].first['analysis_job_id']).to eq(analysis_job.id)
          end

          it 'filters by file_path pattern' do
            get "/api/v1/files_with_violations", params: { file_path: 'spec' }
            data = JSON.parse(response.body)
            expect(data['data'].length).to eq(1)
            expect(data['data'].first['file_path']).to include('spec')
          end
        end

        context 'with sorting' do
          let!(:files) do
            [
              create(:file_with_violations, analysis_job: analysis_job, file_path: 'z_file.rb'),
              create(:file_with_violations, analysis_job: analysis_job, file_path: 'a_file.rb')
            ]
          end

          it 'sorts by file_path asc' do
            get "/api/v1/files_with_violations", params: { sort: 'file_path', direction: 'asc' }
            data = JSON.parse(response.body)
            file_paths = data['data'].map { |f| f['file_path'] }
            expect(file_paths).to eq(file_paths.sort)
          end

          it 'sorts by file_path desc' do
            get "/api/v1/files_with_violations", params: { sort: 'file_path', direction: 'desc' }
            data = JSON.parse(response.body)
            file_paths = data['data'].map { |f| f['file_path'] }
            expect(file_paths).to eq(file_paths.sort.reverse)
          end
        end

        context 'with pagination' do
          before do
            create_list(:file_with_violations, 30, analysis_job: analysis_job)
          end

          it 'respects per_page parameter' do
            get "/api/v1/files_with_violations", params: { per_page: 15 }
            data = JSON.parse(response.body)
            expect(data['data'].length).to eq(15)
            expect(data['meta']['total_pages']).to be > 1
          end

          it 'respects page parameter' do
            get "/api/v1/files_with_violations", params: { page: 2, per_page: 10 }
            data = JSON.parse(response.body)
            expect(data['meta']['current_page']).to eq(2)
          end

          it 'limits per_page to 100' do
            get "/api/v1/files_with_violations", params: { per_page: 200 }
            data = JSON.parse(response.body)
            expect(data['data'].length).to be <= 100
          end
        end
      end
    end
  end
end 