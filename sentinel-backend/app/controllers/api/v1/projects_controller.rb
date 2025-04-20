module Api
  module V1
    class ProjectsController < ApplicationController
      before_action :set_project, only: [:show, :clone_repository]

      # GET /api/v1/projects
      def index
        @projects = Project.all
        render_serialized @projects
      end

      # GET /api/v1/projects/:id
      def show
        render_serialized @project
      end

      # POST /api/v1/projects
      def create
        @project = Project.new(project_params)

        if @project.save
          # Clone repository if URL is provided
          if @project.repository_url.present?
            begin
              Thread.current[:github_token] = request.headers['Authorization']&.split(' ')&.last
              git_service = GitService.new(@project)
              git_service.clone_repository
              render_serialized @project, status: :created
            rescue GitService::GitError => e
              @project.destroy # Rollback project creation if clone fails
              render json: { error: e.message }, status: :unprocessable_entity
            ensure
              Thread.current[:github_token] = nil
            end
          else
            render_serialized @project, status: :created
          end
        else
          render json: { errors: @project.errors }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/projects/:id/clone
      def clone_repository
        begin
          Thread.current[:github_token] = request.headers['Authorization']&.split(' ')&.last
          git_service = GitService.new(@project)
          result = git_service.clone_repository
          render json: { message: 'Repository cloned successfully', path: result[:path] }
        rescue GitService::GitError => e
          render json: { error: e.message }, status: :unprocessable_entity
        ensure
          Thread.current[:github_token] = nil
        end
      end

      private

      def set_project
        @project = Project.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Project not found' }, status: :not_found
      end

      def project_params
        params.require(:project).permit(:name, :repository_url)
      end
    end
  end
end 