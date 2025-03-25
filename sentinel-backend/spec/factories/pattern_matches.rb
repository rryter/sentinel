FactoryBot.define do
  factory :pattern_match do
    file_with_violations
    sequence(:rule_id) { |n| "RULE_#{n}" }
    sequence(:rule_name) { |n| "Security Rule #{n}" }
    sequence(:description) { |n| "Security violation found in code #{n}" }
    start_line { 1 }
    end_line { 1 }
    start_col { 1 }
    end_col { 10 }
    metadata { { "severity": "high" } }
    created_at { Time.current }
  end
end 