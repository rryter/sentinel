class RulesProject < ApplicationRecord
  belongs_to :rule
  belongs_to :project
end
