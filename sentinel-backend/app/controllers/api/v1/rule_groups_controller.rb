module Api
  module V1
    class RuleGroupsController < ApplicationController
      before_action :set_rule_group, only: [:show, :update, :destroy]

      def index
        @rule_groups = RuleGroup.includes(:rules).all
        render json: @rule_groups
      end

      def show
        render json: @rule_group
      end

      def create
        @rule_group = RuleGroup.new(rule_group_params)

        if @rule_group.save
          render json: @rule_group, status: :created
        else
          render json: { errors: @rule_group.errors }, status: :unprocessable_entity
        end
      end

      def update
        if @rule_group.update(rule_group_params)
          render json: @rule_group
        else
          render json: { errors: @rule_group.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        @rule_group.destroy
        head :no_content
      end

      # POST /api/v1/rule_groups/:id/rules
      def add_rules
        @rule_group = RuleGroup.find(params[:id])
        
        ActiveRecord::Base.transaction do
          params[:rule_ids].each do |rule_id|
            @rule_group.rule_group_memberships.create!(
              rule_id: rule_id
            )
          end
        end

        render json: @rule_group
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.message }, status: :unprocessable_entity
      end

      # DELETE /api/v1/rule_groups/:id/rules/:rule_id
      def remove_rule
        @rule_group = RuleGroup.find(params[:id])
        @rule_group.rules.delete(params[:rule_id])
        render json: @rule_group
      end

      private

      def set_rule_group
        @rule_group = RuleGroup.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Rule group not found' }, status: :not_found
      end

      def rule_group_params
        params.require(:rule_group).permit(:name, :description, rule_ids: [])
      end
    end
  end
end
