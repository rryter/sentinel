class RuleGroup < ActiveRecord::Base
  has_many :rule_group_memberships, dependent: :destroy
  has_many :rules, through: :rule_group_memberships

  validates :name, presence: true
  validates :description, presence: true
end
