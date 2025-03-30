module Api
  module V1
    class ProjectsController < ApplicationController
      before_action :set_project, only: [:show]

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
          render_serialized @project, status: :created
        else
          render json: { errors: @project.errors }, status: :unprocessable_entity
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