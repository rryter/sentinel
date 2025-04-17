FactoryBot.define do
  factory :violation do
    file_with_violations
    sequence(:rule_id) { |n| "RULE_#{n}" }
    sequence(:rule_name) { |n| "Security Rule #{n}" }
    sequence(:description) { |n| "Security violation found in code #{n}" }
    start_line { 1 }
    end_line { 1 }
    start_col { 1 }
    end_col { 10 }
    severity { Severity.find_by(name: 'info') || Severity.create!(name: 'info', level: 1, color_code: '#00CCFF', description: 'Informational findings') }
    metadata { { "help": "This is a test violation" } }
    created_at { Time.current }
  end
end 