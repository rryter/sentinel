module Api
  module V1
    class RulesController < ApplicationController
    before_action :set_rule, only: [:show, :update, :destroy]

    # GET /rules
  def index
    @rules = Rule.all
    render json: @rules
  end

    # GET /rules/:id
    def show
        render json: @rule
    end

    # POST /rules
    def create
        @rule = Rule.new(rule_params)

        if @rule.save
        render json: @rule, status: :created
        else
        render json: { errors: @rule.errors }, status: :unprocessable_entity
        end
    end

    # PATCH/PUT /rules/:id
    def update
        if @rule.update(rule_params)
        render json: @rule
        else
        render json: { errors: @rule.errors }, status: :unprocessable_entity
        end
    end

    # DELETE /rules/:id
    def destroy
        @rule.destroy
        head :no_content
    end

    private

    def set_rule
        @rule = Rule.find(params[:id])
    rescue ActiveRecord::RecordNotFound
        render json: { error: 'Rule not found' }, status: :not_found
    end

    def rule_params
        params.require(:rule).permit(:name, :description)
    end
    end
  end 
end