class ProjectSerializer < ActiveModel::Serializer
  attributes :id, :name, :repository_url, :created_at, :updated_at
end 