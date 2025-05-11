class RuleGroupMembership < ApplicationRecord
  belongs_to :rule
  belongs_to :rule_group
end
