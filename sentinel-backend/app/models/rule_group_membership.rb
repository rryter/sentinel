class RuleGroupMembership < ActiveRecord::Base
  belongs_to :rule
  belongs_to :rule_group

  validates :rule_id, uniqueness: { scope: :rule_group_id }
  validates :position, presence: true
  validates :position, uniqueness: { scope: :rule_group_id }

  before_validation :set_position, on: :create

  private

  def set_position
    self.position ||= (rule_group.rule_group_memberships.maximum(:position) || 0) + 1
  end
end
