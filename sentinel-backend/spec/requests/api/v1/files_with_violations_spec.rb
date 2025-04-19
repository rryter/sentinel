require 'swagger_helper'

RSpec.describe 'Api::V1::FilesWithViolations', type: :request do
  path '/api/v1/files_with_violations' do
    parameter name: :page, in: :query, type: :integer, required: false, description: 'Page number'
    parameter name: :per_page, in: :query, type: :integer, required: false, description: 'Items per page'
    parameter name: :analysis_job_id, in: :query, type: :integer, required: false, description: 'Filter by analysis job ID'
    parameter name: :file_path, in: :query, type: :string, required: false, description: 'Filter by file path pattern'
    parameter name: :rule_name, in: :query, type: :string, required: false, description: 'Filter by rule name'
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
          let!(:violation) { create(:violation, file_with_violations: file_with_violations, rule_name: 'security/sql_injection') }
          let!(:another_violation) { create(:violation, file_with_violations: another_file, rule_name: 'security/xss') }
          
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

          it 'filters by rule_name' do
            get "/api/v1/files_with_violations", params: { rule_name: 'security/sql_injection' }
            data = JSON.parse(response.body)
            
            # Verify only one file is returned
            expect(data['data'].length).to eq(1)
            
            # Verify it's the file with SQL injection violation
            returned_file = data['data'].first
            expect(returned_file['id']).to eq(file_with_violations.id)
            
            # Verify the file with XSS violation is not included
            file_ids = data['data'].map { |f| f['id'] }
            expect(file_ids).not_to include(another_file.id)
          end

          it 'correctly filters by rule_name when files have multiple violations' do
            # Create a new analysis job specifically for this test to isolate the data
            isolated_analysis_job = create(:analysis_job)
            
            # Create files with multiple violations
            file1 = create(:file_with_violations, analysis_job: isolated_analysis_job, file_path: 'app/models/user.rb')
            file2 = create(:file_with_violations, analysis_job: isolated_analysis_job, file_path: 'app/models/post.rb')
            file3 = create(:file_with_violations, analysis_job: isolated_analysis_job, file_path: 'app/models/comment.rb')

            # Add multiple violations to each file
            sql_violation1 = create(:violation, file_with_violations: file1, rule_name: 'security/sql_injection')
            xss_violation1 = create(:violation, file_with_violations: file1, rule_name: 'security/xss')
            nplus_violation1 = create(:violation, file_with_violations: file1, rule_name: 'performance/n_plus_one')

            xss_violation2 = create(:violation, file_with_violations: file2, rule_name: 'security/xss')
            nplus_violation2 = create(:violation, file_with_violations: file2, rule_name: 'performance/n_plus_one')

            sql_violation3 = create(:violation, file_with_violations: file3, rule_name: 'security/sql_injection')
            nplus_violation3 = create(:violation, file_with_violations: file3, rule_name: 'performance/n_plus_one')

            # Filter by sql_injection rule
            get "/api/v1/files_with_violations", params: { rule_name: 'security/sql_injection', analysis_job_id: isolated_analysis_job.id }
            data = JSON.parse(response.body)

            # Should return files that have sql_injection violations (file1 and file3)
            expect(data['data'].length).to eq(2)
            returned_files = data['data']
            
            # Verify each returned file has only sql_injection violations
            returned_files.each do |file|
              expect(file['violations']).to be_present
              expect(file['violations'].length).to eq(1)
              expect(file['violations'].first['rule_name']).to eq('security/sql_injection')
            end

            # Verify the correct files are returned
            returned_file_paths = returned_files.map { |f| f['file_path'] }
            expect(returned_file_paths).to contain_exactly('app/models/user.rb', 'app/models/comment.rb')

            # Filter by xss rule
            get "/api/v1/files_with_violations", params: { rule_name: 'security/xss', analysis_job_id: isolated_analysis_job.id }
            data = JSON.parse(response.body)

            # Should return files that have xss violations (file1 and file2)
            expect(data['data'].length).to eq(2)
            returned_files = data['data']
            
            # Verify each returned file has only xss violations
            returned_files.each do |file|
              expect(file['violations']).to be_present
              expect(file['violations'].length).to eq(1)
              expect(file['violations'].first['rule_name']).to eq('security/xss')
            end

            # Verify the correct files are returned
            returned_file_paths = returned_files.map { |f| f['file_path'] }
            expect(returned_file_paths).to contain_exactly('app/models/user.rb', 'app/models/post.rb')

            # Filter by n_plus_one rule
            get "/api/v1/files_with_violations", params: { rule_name: 'performance/n_plus_one', analysis_job_id: isolated_analysis_job.id }
            data = JSON.parse(response.body)

            # Should return all files as they all have n_plus_one violations
            expect(data['data'].length).to eq(3)
            returned_files = data['data']
            
            # Verify each returned file has only n_plus_one violations
            returned_files.each do |file|
              expect(file['violations']).to be_present
              expect(file['violations'].length).to eq(1)
              expect(file['violations'].first['rule_name']).to eq('performance/n_plus_one')
            end

            # Verify all files are returned
            returned_file_paths = returned_files.map { |f| f['file_path'] }
            expect(returned_file_paths).to contain_exactly(
              'app/models/user.rb',
              'app/models/post.rb',
              'app/models/comment.rb'
            )

            # Filter by multiple rules (sql_injection and xss)
            get "/api/v1/files_with_violations", params: { 
              rule_name: 'security/sql_injection,security/xss',
              analysis_job_id: isolated_analysis_job.id
            }
            data = JSON.parse(response.body)

            # Should return all files that have either sql_injection or xss violations
            expect(data['data'].length).to eq(3)
            returned_files = data['data']
            
            # Verify each returned file has only sql_injection or xss violations
            returned_files.each do |file|
              expect(file['violations']).to be_present
              expect(file['violations'].map { |v| v['rule_name'] }).to all(satisfy { |name| 
                ['security/sql_injection', 'security/xss'].include?(name)
              })
            end

            # Verify the correct files are returned
            returned_file_paths = returned_files.map { |f| f['file_path'] }
            expect(returned_file_paths).to contain_exactly(
              'app/models/user.rb',  # has both sql_injection and xss
              'app/models/post.rb',  # has xss
              'app/models/comment.rb' # has sql_injection
            )

            # Verify each file has the correct violations
            user_file = returned_files.find { |f| f['file_path'] == 'app/models/user.rb' }
            expect(user_file['violations'].map { |v| v['rule_name'] }).to contain_exactly(
              'security/sql_injection',
              'security/xss'
            )

            post_file = returned_files.find { |f| f['file_path'] == 'app/models/post.rb' }
            expect(post_file['violations'].map { |v| v['rule_name'] }).to contain_exactly(
              'security/xss'
            )

            comment_file = returned_files.find { |f| f['file_path'] == 'app/models/comment.rb' }
            expect(comment_file['violations'].map { |v| v['rule_name'] }).to contain_exactly(
              'security/sql_injection'
            )
          end

          context 'with edge cases' do
            let!(:isolated_analysis_job) { create(:analysis_job) }
            let!(:file1) { create(:file_with_violations, analysis_job: isolated_analysis_job, file_path: 'app/models/user.rb') }
            let!(:file2) { create(:file_with_violations, analysis_job: isolated_analysis_job, file_path: 'app/models/post.rb') }
            let!(:file3) { create(:file_with_violations, analysis_job: isolated_analysis_job, file_path: 'app/models/comment.rb') }

            before do
              # Add multiple violations to each file
              create(:violation, file_with_violations: file1, rule_name: 'security/sql_injection')
              create(:violation, file_with_violations: file1, rule_name: 'security/xss')
              create(:violation, file_with_violations: file1, rule_name: 'performance/n_plus_one')

              create(:violation, file_with_violations: file2, rule_name: 'security/xss')
              create(:violation, file_with_violations: file2, rule_name: 'performance/n_plus_one')

              create(:violation, file_with_violations: file3, rule_name: 'security/sql_injection')
              create(:violation, file_with_violations: file3, rule_name: 'performance/n_plus_one')
            end

            it 'handles empty rule_name parameter gracefully' do
              get "/api/v1/files_with_violations", params: { rule_name: '', analysis_job_id: isolated_analysis_job.id }
              data = JSON.parse(response.body)
              expect(data['data'].length).to eq(3) # Should return all files since no filter
              
              # Each file should have all its violations
              data['data'].each do |file|
                expect(file['violations']).to be_present
                case file['file_path']
                when 'app/models/user.rb'
                  expect(file['violations'].length).to eq(3)
                when 'app/models/post.rb'
                  expect(file['violations'].length).to eq(2)
                when 'app/models/comment.rb'
                  expect(file['violations'].length).to eq(2)
                end
              end
            end

            it 'handles non-existent rule names' do
              get "/api/v1/files_with_violations", params: { 
                rule_name: 'non/existent/rule',
                analysis_job_id: isolated_analysis_job.id
              }
              data = JSON.parse(response.body)
              expect(data['data'].length).to eq(0) # Should return no files
            end

            it 'handles mixed valid and invalid rule names' do
              get "/api/v1/files_with_violations", params: { 
                rule_name: 'security/sql_injection,non/existent/rule',
                analysis_job_id: isolated_analysis_job.id
              }
              data = JSON.parse(response.body)
              expect(data['data'].length).to eq(2) # Should return files with sql_injection
              
              # Verify only sql_injection violations are included
              data['data'].each do |file|
                expect(file['violations']).to be_present
                expect(file['violations'].length).to eq(1)
                expect(file['violations'].first['rule_name']).to eq('security/sql_injection')
              end
            end

            it 'handles whitespace in rule names' do
              get "/api/v1/files_with_violations", params: { 
                rule_name: ' security/sql_injection , security/xss ',
                analysis_job_id: isolated_analysis_job.id
              }
              data = JSON.parse(response.body)
              expect(data['data'].length).to eq(3)
              
              # Verify correct violations are included despite whitespace
              data['data'].each do |file|
                expect(file['violations']).to be_present
                expect(file['violations'].map { |v| v['rule_name'] }).to all(satisfy { |name| 
                  ['security/sql_injection', 'security/xss'].include?(name)
                })
              end
            end

            it 'handles empty items in comma-separated list' do
              get "/api/v1/files_with_violations", params: { 
                rule_name: 'security/sql_injection,,security/xss',
                analysis_job_id: isolated_analysis_job.id
              }
              data = JSON.parse(response.body)
              expect(data['data'].length).to eq(3)
              
              # Verify correct violations are included despite empty item
              data['data'].each do |file|
                expect(file['violations']).to be_present
                expect(file['violations'].map { |v| v['rule_name'] }).to all(satisfy { |name| 
                  ['security/sql_injection', 'security/xss'].include?(name)
                })
              end
            end
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