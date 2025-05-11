class Rule < ApplicationRecord
  has_many :project_rules, dependent: :destroy
  has_many :projects, through: :project_rules

  validates :name, presence: true, uniqueness: true
  validates :description, presence: true
end
