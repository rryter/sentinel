module Api
  module V1
    class GithubController < ApplicationController
      def callback
        client = Octokit::Client.new
        result = client.exchange_code_for_token(
          params[:code],
          Rails.application.credentials.github[:client_id],
          Rails.application.credentials.github[:client_secret]
        )
        
        render json: { access_token: result.access_token }
      rescue Octokit::Error => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      def repositories
        token = request.headers['Authorization']&.split(' ')&.last
        return render json: { error: 'No authorization token provided' }, status: :unauthorized unless token

        begin
          client = Octokit::Client.new(access_token: token)
          # Verify the token by making a test request
          client.user
          
          # Now fetch repositories
          repos = client.repositories(nil, sort: :updated, type: 'all')
          
          render json: { 
            data: repos.map { |repo| {
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              html_url: repo.html_url,
              private: repo.private,
              description: repo.description
            }}
          }
        rescue Octokit::Unauthorized
          render json: { error: 'Invalid GitHub token' }, status: :unauthorized
        rescue Octokit::Error => e
          render json: { error: e.message }, status: :unprocessable_entity
        end
      end
    end
  end
end 