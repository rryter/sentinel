class RulesProject < ActiveRecord::Base
  belongs_to :rule
  belongs_to :project
end
