FactoryBot.define do
  factory :analysis_job do
    project
    status { 'pending' }
    total_files { nil }
    processed_files { nil }
    completed_at { nil }
    go_job_id { nil }

    trait :completed do
      status { 'completed' }
      total_files { 10 }
      processed_files { 10 }
      completed_at { Time.current }
      go_job_id { SecureRandom.uuid }
    end

    trait :running do
      status { 'running' }
      total_files { 10 }
      processed_files { 5 }
      go_job_id { SecureRandom.uuid }
    end

    trait :failed do
      status { 'failed' }
      total_files { 10 }
      processed_files { 3 }
      go_job_id { SecureRandom.uuid }
    end
  end
end 