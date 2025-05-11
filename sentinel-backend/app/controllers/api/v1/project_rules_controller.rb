module Api
  module V1
    class ProjectRulesController < ApplicationController
      before_action :set_project
      before_action :set_rule, only: [:update, :toggle]

      # GET /api/v1/projects/:project_id/rules
      def index
        @rules = Rule.includes(:project_rules).all
        render json: @rules, each_serializer: RuleWithProjectStateSerializer, project: @project
      end

      # PATCH/PUT /api/v1/projects/:project_id/rules/:id
      def update
        @project_rule = ProjectRule.find_or_initialize_by(
          project: @project,
          rule: @rule
        )

        if @project_rule.update(project_rule_params)
          render json: @project_rule
        else
          render json: { errors: @project_rule.errors }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/projects/:project_id/rules/:id/toggle
      def toggle
        @project_rule = ProjectRule.find_or_initialize_by(
          project: @project,
          rule: @rule
        )
        
        @project_rule.enabled = !@project_rule.enabled

        if @project_rule.save
          render json: @project_rule
        else
          render json: { errors: @project_rule.errors }, status: :unprocessable_entity
        end
      end

      private

      def set_project
        @project = Project.find(params[:project_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Project not found' }, status: :not_found
      end

      def set_rule
        @rule = Rule.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Rule not found' }, status: :not_found
      end

      def project_rule_params
        params.require(:rule).permit(:enabled)
      end
    end
  end
end
