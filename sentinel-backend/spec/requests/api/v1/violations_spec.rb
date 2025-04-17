require 'swagger_helper'

RSpec.describe 'Api::V1::Violations', type: :request do
  path '/api/v1/violations' do
    get 'Lists all violations' do
      tags 'Violations'
      produces 'application/json'
      parameter name: :page, in: :query, type: :integer, required: false, description: 'Page number'
      parameter name: :per_page, in: :query, type: :integer, required: false, description: 'Items per page'
      parameter name: :rule_name, in: :query, type: :string, required: false, description: 'Filter by rule name'
      parameter name: :rule_id, in: :query, type: :string, required: false, description: 'Filter by rule ID'
      parameter name: :analysis_job_id, in: :query, type: :integer, required: false, description: 'Filter by analysis job ID'
      parameter name: :file_path, in: :query, type: :string, required: false, description: 'Filter by file path pattern'
      
      response '200', 'violations found' do
        schema type: 'object',
          properties: {
            data: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  rule_id: { type: 'string' },
                  rule_name: { type: 'string' },
                  line_number: { type: 'integer' },
                  column: { type: 'integer' },
                  match_text: { type: 'string' },
                  file_with_violations: {
                    type: 'object',
                    properties: {
                      file_path: { type: 'string' }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                total_count: { type: 'integer' },
                current_page: { type: 'integer' },
                total_pages: { type: 'integer' },
                analysis_job_id: { 
                  type: 'integer',
                  nullable: true
                }
              }
            }
          }
          
        run_test!
      end
    end
  end
  
  path '/api/v1/violations/time_series' do
    get 'Gets time series data for violations' do
      tags 'Violations'
      produces 'application/json'
      parameter name: :start_date, in: :query, type: :string, description: 'Start date for the time series (default: 30 days ago)'
      parameter name: :end_date, in: :query, type: :string, description: 'End date for the time series (default: today)'
      parameter name: :rule_id, in: :query, type: :string, required: false, description: 'Filter by rule ID'
      parameter name: :rule_name, in: :query, type: :string, required: false, description: 'Filter by rule name'
      parameter name: :analysis_job_id, in: :query, type: :integer, required: false, description: 'Filter by analysis job ID'
      
      response '200', 'time series data retrieved' do
        schema type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  count: { type: 'integer' }
                },
                required: ['date', 'count']
              }
            }
          }
          
        let!(:analysis_job) { create(:analysis_job) }
        let!(:file_with_violations) { create(:file_with_violations, analysis_job: analysis_job) }
        let!(:violations) do
          [
            create(:violation, file_with_violations: file_with_violations, created_at: 2.days.ago),
            create(:violation, file_with_violations: file_with_violations, created_at: 1.day.ago),
            create(:violation, file_with_violations: file_with_violations, created_at: Time.current)
          ]
        end
        let(:start_date) { 3.days.ago.strftime('%Y-%m-%d') }
        let(:end_date) { Time.current.strftime('%Y-%m-%d') }
          
        run_test!
      end
    end
  end
  
  path '/api/v1/analysis_jobs/{analysis_job_id}/violations' do
    parameter name: :analysis_job_id, in: :path, type: :integer
    parameter name: :page, in: :query, type: :integer, required: false, description: 'Page number'
    parameter name: :per_page, in: :query, type: :integer, required: false, description: 'Items per page'
    parameter name: :rule_name, in: :query, type: :string, required: false, description: 'Filter by rule name'
    parameter name: :rule_id, in: :query, type: :string, required: false, description: 'Filter by rule ID'
    parameter name: :file_path, in: :query, type: :string, required: false, description: 'Filter by file path pattern'
    
    get 'Lists violations for an analysis job' do
      tags 'Violations'
      produces 'application/json'
      
      response '200', 'violations found' do
        schema type: 'object',
          properties: {
            data: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  rule_id: { type: 'string' },
                  rule_name: { type: 'string' },
                  line_number: { type: 'integer' },
                  column: { type: 'integer' },
                  match_text: { type: 'string' },
                  file_with_violations: {
                    type: 'object',
                    properties: {
                      file_path: { type: 'string' }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                total_count: { type: 'integer' },
                current_page: { type: 'integer' },
                total_pages: { type: 'integer' },
                analysis_job_id: { type: 'integer' }
              }
            }
          }
          
        let(:analysis_job_id) { create(:analysis_job).id }
        run_test!
      end
      
      response '404', 'analysis job not found' do
        let(:analysis_job_id) { 'invalid' }
        run_test!
      end
    end
  end
  
  path '/api/v1/analysis_jobs/{analysis_job_id}/violations/time_series' do
    parameter name: :analysis_job_id, in: :path, type: :integer
    parameter name: :start_date, in: :query, type: :string, description: 'Start date for the time series (default: 30 days ago)'
    parameter name: :end_date, in: :query, type: :string, description: 'End date for the time series (default: today)'
    parameter name: :rule_id, in: :query, type: :string, required: false, description: 'Filter by rule ID'
    parameter name: :rule_name, in: :query, type: :string, required: false, description: 'Filter by rule name'
    
    get 'Gets time series data for violations in an analysis job' do
      tags 'Violations'
      produces 'application/json'
      
      response '200', 'time series data retrieved' do
        schema type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  count: { type: 'integer' }
                },
                required: ['date', 'count']
              }
            }
          }
          
        let!(:analysis_job) { create(:analysis_job) }
        let!(:file_with_violations) { create(:file_with_violations, analysis_job: analysis_job) }
        let!(:violations) do
          [
            create(:violation, file_with_violations: file_with_violations, created_at: 2.days.ago),
            create(:violation, file_with_violations: file_with_violations, created_at: 1.day.ago),
            create(:violation, file_with_violations: file_with_violations, created_at: Time.current)
          ]
        end
        let(:analysis_job_id) { analysis_job.id }
        let(:start_date) { 3.days.ago.strftime('%Y-%m-%d') }
        let(:end_date) { Time.current.strftime('%Y-%m-%d') }
          
        run_test!
      end
      
      response '404', 'analysis job not found' do
        let(:analysis_job_id) { 'invalid' }
        let(:start_date) { 3.days.ago.strftime('%Y-%m-%d') }
        let(:end_date) { Time.current.strftime('%Y-%m-%d') }
        run_test!
      end
    end
  end
end 