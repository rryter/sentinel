module Api
  module V1
    class ProjectRuleSerializer < ActiveModel::Serializer
      attributes :id, :rule_id, :project_id, :enabled

      belongs_to :rule
      belongs_to :project
    end
  end
end
