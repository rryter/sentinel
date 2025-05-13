FactoryBot.define do
  factory :rule do
    sequence(:name) { |n| "Rule #{n}" }
    description { "This is a test rule description" }
  end

  factory :project_rule do
    rule
    project
    enabled { true }
  end

  factory :rule_group do
    sequence(:name) { |n| "Rule Group #{n}" }
    description { "This is a test rule group description" }
  end

  factory :rule_group_membership do
    rule
    rule_group
    sequence(:position)
  end
end
