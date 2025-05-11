module Api
  module V1
    class RuleWithProjectStateSerializer < RuleSerializer
      attribute :enabled

      def enabled
        project_rule = object.project_rules.find { |pr| pr.project_id == instance_options[:project].id }
        project_rule&.enabled || false
      end
    end
  end
end
