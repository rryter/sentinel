module Api
  module V1
    class RuleGroupSerializer < ActiveModel::Serializer
      attributes :id, :name, :description, :created_at, :updated_at
      
      has_many :rules, serializer: RuleSerializer
    end
  end
end
