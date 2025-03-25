require 'swagger_helper'

RSpec.describe 'Api::V1::PatternMatches', type: :request do
  path '/api/v1/pattern_matches' do
    get 'Lists all pattern matches' do
      tags 'Pattern Matches'
      produces 'application/json'
      parameter name: :page, in: :query, type: :integer, required: false, description: 'Page number'
      parameter name: :per_page, in: :query, type: :integer, required: false, description: 'Items per page'
      parameter name: :rule_name, in: :query, type: :string, required: false, description: 'Filter by rule name'
      parameter name: :rule_id, in: :query, type: :string, required: false, description: 'Filter by rule ID'
      parameter name: :analysis_job_id, in: :query, type: :integer, required: false, description: 'Filter by analysis job ID'
      parameter name: :file_path, in: :query, type: :string, required: false, description: 'Filter by file path pattern'
      
      response '200', 'pattern matches found' do
        schema type: 'object',
          properties: {
            matches: { 
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
                  analysis_file: {
                    type: 'object',
                    properties: {
                      file_path: { type: 'string' }
                    }
                  }
                }
              }
            },
            total_count: { type: 'integer' },
            current_page: { type: 'integer' },
            total_pages: { type: 'integer' },
            analysis_job_id: { 
              type: 'integer',
              nullable: true
            }
          }
          
        run_test!
      end
    end
  end
  
  path '/api/v1/pattern_matches/time_series' do
    get 'Gets time series data for pattern matches' do
      tags 'Pattern Matches'
      produces 'application/json'
      parameter name: :start_date, in: :query, type: :string, description: 'Start date for the time series (default: 30 days ago)'
      parameter name: :end_date, in: :query, type: :string, description: 'End date for the time series (default: today)'
      parameter name: :rule_id, in: :query, type: :string, required: false, description: 'Filter by rule ID'
      parameter name: :rule_name, in: :query, type: :string, required: false, description: 'Filter by rule name'
      parameter name: :analysis_job_id, in: :query, type: :integer, required: false, description: 'Filter by analysis job ID'
      
      response '200', 'time series data retrieved' do
        schema type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              count: { type: 'integer' }
            },
            required: ['date', 'count']
          }
          
        run_test!
      end
    end
  end
  
  path '/api/v1/analysis_jobs/{analysis_job_id}/pattern_matches' do
    parameter name: :analysis_job_id, in: :path, type: :integer
    parameter name: :page, in: :query, type: :integer, required: false, description: 'Page number'
    parameter name: :per_page, in: :query, type: :integer, required: false, description: 'Items per page'
    parameter name: :rule_name, in: :query, type: :string, required: false, description: 'Filter by rule name'
    parameter name: :rule_id, in: :query, type: :string, required: false, description: 'Filter by rule ID'
    parameter name: :file_path, in: :query, type: :string, required: false, description: 'Filter by file path pattern'
    
    get 'Lists pattern matches for an analysis job' do
      tags 'Pattern Matches'
      produces 'application/json'
      
      response '200', 'pattern matches found' do
        schema type: 'object',
          properties: {
            matches: { 
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
                  analysis_file: {
                    type: 'object',
                    properties: {
                      file_path: { type: 'string' }
                    }
                  }
                }
              }
            },
            total_count: { type: 'integer' },
            current_page: { type: 'integer' },
            total_pages: { type: 'integer' },
            analysis_job_id: { type: 'integer' }
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
  
  path '/api/v1/analysis_jobs/{analysis_job_id}/pattern_matches/time_series' do
    parameter name: :analysis_job_id, in: :path, type: :integer
    parameter name: :start_date, in: :query, type: :string, description: 'Start date for the time series (default: 30 days ago)'
    parameter name: :end_date, in: :query, type: :string, description: 'End date for the time series (default: today)'
    parameter name: :rule_id, in: :query, type: :string, required: false, description: 'Filter by rule ID'
    parameter name: :rule_name, in: :query, type: :string, required: false, description: 'Filter by rule name'
    
    get 'Gets time series data for pattern matches in an analysis job' do
      tags 'Pattern Matches'
      produces 'application/json'
      
      response '200', 'time series data retrieved' do
        schema type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              count: { type: 'integer' }
            },
            required: ['date', 'count']
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
end 