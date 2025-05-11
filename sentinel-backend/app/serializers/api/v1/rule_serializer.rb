module Api
  module V1
    class RuleSerializer < ActiveModel::Serializer
      attributes :id, :name, :description, :created_at, :updated_at
    end
  end
end
