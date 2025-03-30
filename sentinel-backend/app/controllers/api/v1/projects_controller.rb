module Api
  module V1
    class ProjectsController < ApplicationController
      before_action :set_project, only: [:show]

      # GET /api/v1/projects
      def index
        @projects = Project.all
          .order(created_at: :desc)
          .page(params[:page])
          .per(params[:per_page])
        
        render json: {
          data: ActiveModelSerializers::SerializableResource.new(@projects, each_serializer: ProjectSerializer, adapter: :attributes).as_json,
          meta: {
            current_page: @projects.current_page,
            total_pages: @projects.total_pages,
            total_count: @projects.total_count
          }
        }
      end

      # GET /api/v1/projects/:id
      def show
        render json: {
          data: ActiveModelSerializers::SerializableResource.new(@project, adapter: :attributes).as_json
        }
      end

      # POST /api/v1/projects
      def create
        @project = Project.new(project_params)

        if @project.save
          render json: {
            data: ActiveModelSerializers::SerializableResource.new(@project, adapter: :attributes).as_json
          }, status: :created
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