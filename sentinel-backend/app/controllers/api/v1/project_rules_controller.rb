module Api
  module V1
    class ProjectRulesController < ApplicationController
      before_action :set_project
      before_action :set_rule, only: [:update, :toggle]

      # GET /api/v1/projects/:project_id/rules
      def index
        rules_array = Rule.includes(:project_rules).all.map do |rule|
          project_rule = rule.project_rules.find_by(project: @project)
          {
            id: rule.id,
            name: rule.name,
            description: rule.description,
            enabled: project_rule&.enabled || false,
            created_at: rule.created_at,
            updated_at: rule.updated_at
          }
        end

        # Fix the serialization issue by specifying a root
        render json: { rules: rules_array }, status: :ok
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
