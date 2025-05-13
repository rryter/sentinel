FactoryBot.define do
  factory :build_metric do
    timestamp { Time.current }
    duration_ms { rand(1000..10000) }
    is_initial_build { [true, false].sample }
    machine_hostname { "test-host" }
    machine_platform { "linux" }
    machine_cpu_count { rand(1..16) }
    machine_memory_total { rand(8..64) * 1024**3 } # 8GB to 64GB
    machine_memory_free { (machine_memory_total * rand(0.1..0.9)).to_i }
    process_node_version { "v18.0.0" }
    process_memory { rand(100..500) * 1024**2 } # 100MB to 500MB
    build_files_count { rand(10..1000) }
    build_output_dir { "/tmp/build" }
    build_error_count { rand(0..5) }
    build_warning_count { rand(0..10) }
    build_entry_points { ["./src/index.js"] }
    build_file_types { { "js" => rand(10..100), "css" => rand(5..50) } }
    workspace_name { "@test/workspace" }
    workspace_project { "test-project" }
    workspace_environment { "test" }
    workspace_user { "test-user" }
    workspace_task { "build" }
  end
end
