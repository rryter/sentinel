class Rule < ActiveRecord::Base
  has_many :project_rules, dependent: :destroy
  has_many :projects, through: :project_rules
  has_many :rule_group_memberships, dependent: :destroy
  has_many :rule_groups, through: :rule_group_memberships

  validates :name, presence: true, uniqueness: true
  validates :description, presence: true
end
