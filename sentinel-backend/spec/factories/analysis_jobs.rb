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
    duration { nil }
    files_per_second_wall_time { nil }
    cumulative_processing_time_ms { nil }
    avg_time_per_file_ms { nil }
    files_per_second_cpu_time { nil }
    parallel_cores_used { nil }
    parallel_speedup_factor { nil }
    parallel_efficiency_percent { nil }

    trait :completed do
      status { 'completed' }
      total_files { 10 }
      processed_files { 10 }
      total_matches { 25 }
      rules_matched { 5 }
      completed_at { Time.current }
      go_job_id { SecureRandom.uuid }
      duration { 2500 }
      files_per_second_wall_time { 4.0 }
      cumulative_processing_time_ms { 2500 }
      avg_time_per_file_ms { 250.0 }
      files_per_second_cpu_time { 8.0 }
      parallel_cores_used { 4 }
      parallel_speedup_factor { 3.8 }
      parallel_efficiency_percent { 95.0 }
    end

    trait :running do
      status { 'running' }
      total_files { 10 }
      processed_files { 5 }
      total_matches { 12 }
      rules_matched { 3 }
      go_job_id { SecureRandom.uuid }
      files_per_second_wall_time { 3.5 }
      cumulative_processing_time_ms { 1200 }
      avg_time_per_file_ms { 240.0 }
      files_per_second_cpu_time { 7.0 }
      parallel_cores_used { 4 }
      parallel_speedup_factor { 3.6 }
      parallel_efficiency_percent { 90.0 }
    end

    trait :failed do
      status { 'failed' }
      total_files { 10 }
      processed_files { 3 }
      total_matches { 8 }
      rules_matched { 2 }
      go_job_id { SecureRandom.uuid }
      files_per_second_wall_time { 2.0 }
      cumulative_processing_time_ms { 800 }
      avg_time_per_file_ms { 266.7 }
      files_per_second_cpu_time { 4.0 }
      parallel_cores_used { 4 }
      parallel_speedup_factor { 3.0 }
      parallel_efficiency_percent { 75.0 }
    end
  end
end 