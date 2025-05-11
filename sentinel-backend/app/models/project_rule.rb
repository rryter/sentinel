class ProjectRule < ApplicationRecord
  belongs_to :project
  belongs_to :rule

  validates :project_id, presence: true
  validates :rule_id, presence: true
  # Ensures that a rule can only be associated with a project once
  validates :rule_id, uniqueness: { scope: :project_id }
end
