FactoryBot.define do
  factory :analysis_job do
    project
    status { 'pending' }
    total_files { nil }
    processed_files { nil }
    total_matches { nil }
    rules_matched { nil }
    completed_at { nil }
    go_job_id { nil }

    trait :completed do
      status { 'completed' }
      total_files { 10 }
      processed_files { 10 }
      total_matches { 25 }
      rules_matched { 5 }
      completed_at { Time.current }
      go_job_id { SecureRandom.uuid }
    end

    trait :running do
      status { 'running' }
      total_files { 10 }
      processed_files { 5 }
      total_matches { 12 }
      rules_matched { 3 }
      go_job_id { SecureRandom.uuid }
    end

    trait :failed do
      status { 'failed' }
      total_files { 10 }
      processed_files { 3 }
      total_matches { 8 }
      rules_matched { 2 }
      go_job_id { SecureRandom.uuid }
    end
  end
end 