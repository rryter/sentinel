require 'rails_helper'

RSpec.describe Api::V1::AnalysisJobsController, type: :request do
  let(:project) { create(:project) }
  let(:valid_attributes) do
    {
      project_id: project.id,
      repository_url: 'https://github.com/test/repo.git',
      branch: 'main',
      commit_sha: 'abc123',
      status: 'pending'
    }
  end

  describe 'GET /api/v1/analysis_jobs' do
    context 'when analysis jobs exist' do
      let!(:analysis_jobs) { create_list(:analysis_job, 5, :completed, project: project) }

      it 'returns a list of analysis jobs' do
        get '/api/v1/analysis_jobs'
        expect(response).to have_http_status(:ok)
        data = JSON.parse(response.body)
        expect(data['data']).to be_an(Array)
        expect(data['data'].length).to eq(5)
      end

      context 'with pagination' do
        it 'returns paginated results' do
          get '/api/v1/analysis_jobs', params: { page: 1, per_page: 2 }
          expect(response).to have_http_status(:ok)
          data = JSON.parse(response.body)
          expect(data['data'].length).to eq(2)
          expect(data['meta']['current_page']).to eq(1)
          expect(data['meta']['total_pages']).to eq(3)
          expect(data['meta']['total_count']).to eq(5)
        end

        it 'returns the second page' do
          get '/api/v1/analysis_jobs', params: { page: 2, per_page: 2 }
          expect(response).to have_http_status(:ok)
          data = JSON.parse(response.body)
          expect(data['data'].length).to eq(2)
          expect(data['meta']['current_page']).to eq(2)
        end

        it 'returns the last page' do
          get '/api/v1/analysis_jobs', params: { page: 3, per_page: 2 }
          expect(response).to have_http_status(:ok)
          data = JSON.parse(response.body)
          expect(data['data'].length).to eq(1)
          expect(data['meta']['current_page']).to eq(3)
        end
      end
    end

    context 'when no analysis jobs exist' do
      it 'returns an empty array' do
        get '/api/v1/analysis_jobs'
        expect(response).to have_http_status(:ok)
        data = JSON.parse(response.body)
        expect(data['data']).to be_an(Array)
        expect(data['data']).to be_empty
      end
    end
  end

  describe 'POST /api/v1/analysis_jobs' do
    context 'with valid parameters' do
      it 'creates a new analysis job' do
        expect {
          post '/api/v1/analysis_jobs', params: valid_attributes
        }.to change(AnalysisJob, :count).by(1)

        expect(response).to have_http_status(:created)
        data = JSON.parse(response.body)
        expect(data['data']['status']).to eq('pending')
        expect(data['data']['project_id']).to eq(project.id)
      end
    end

    context 'with invalid parameters' do
      it 'returns unprocessable entity status' do
        post '/api/v1/analysis_jobs', params: { project_id: nil }
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe 'GET /api/v1/analysis_jobs/:id' do
    let(:analysis_job) { create(:analysis_job, :completed, project: project) }

    context 'when the analysis job exists' do
      it 'returns the analysis job' do
        get "/api/v1/analysis_jobs/#{analysis_job.id}"
        expect(response).to have_http_status(:ok)
        data = JSON.parse(response.body)
        expect(data['data']['id']).to eq(analysis_job.id)
      end
    end

    context 'when the analysis job does not exist' do
      it 'returns not found status' do
        get '/api/v1/analysis_jobs/0'
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'GET /api/v1/analysis_jobs/:id/fetch_results' do
    let(:analysis_job) { create(:analysis_job, :completed, project: project) }

    context 'when the analysis job exists' do
      it 'returns the analysis job results' do
        get "/api/v1/analysis_jobs/#{analysis_job.id}/fetch_results"
        expect(response).to have_http_status(:ok)
        data = JSON.parse(response.body)
        expect(data['data']['id']).to eq(analysis_job.id)
      end
    end

    context 'when the analysis job does not exist' do
      it 'returns not found status' do
        get '/api/v1/analysis_jobs/0/fetch_results'
        expect(response).to have_http_status(:not_found)
      end
    end

    context 'when the service is unavailable' do
      before do
        allow_any_instance_of(AnalysisJob).to receive(:fetch_results).and_raise(StandardError)
      end

      it 'returns service unavailable status' do
        get "/api/v1/analysis_jobs/#{analysis_job.id}/fetch_results"
        expect(response).to have_http_status(:service_unavailable)
      end
    end
  end

  describe 'POST /api/v1/analysis_jobs/:id/process_results' do
    let(:analysis_job) { create(:analysis_job, :completed, project: project) }

    context 'when the analysis job exists' do
      it 'schedules results processing' do
        expect(ProcessAnalysisResultsJob).to receive(:perform_later).with(analysis_job.id)
        post "/api/v1/analysis_jobs/#{analysis_job.id}/process_results"
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['message']).to eq('Analysis results processing has been scheduled')
      end
    end

    context 'when the analysis job does not exist' do
      it 'returns not found status' do
        post '/api/v1/analysis_jobs/0/process_results'
        expect(response).to have_http_status(:not_found)
      end
    end
  end
end 