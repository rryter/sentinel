# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_04_21_145956) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "analysis_jobs", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.string "status", default: "pending", null: false
    t.integer "total_files"
    t.integer "processed_files"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "go_job_id"
    t.text "error_message"
    t.integer "total_matches"
    t.integer "rules_matched"
    t.integer "files_processed", comment: "Number of files processed during analysis"
    t.float "files_per_second_wall_time", comment: "Files processed per second (wall time)"
    t.integer "cumulative_processing_time_ms", comment: "Cumulative processing time in milliseconds"
    t.float "avg_time_per_file_ms", comment: "Average time per file in milliseconds"
    t.float "files_per_second_cpu_time", comment: "Files processed per second (CPU time)"
    t.integer "parallel_cores_used", comment: "Number of CPU cores used in parallel processing"
    t.float "parallel_speedup_factor", comment: "Speedup factor from parallel processing"
    t.float "parallel_efficiency_percent", comment: "Efficiency of parallel processing in percent"
    t.bigint "duration_ms", default: 0, null: false
    t.index ["project_id"], name: "index_analysis_jobs_on_project_id"
    t.index ["status"], name: "index_analysis_jobs_on_status"
  end

  create_table "build_metrics", force: :cascade do |t|
    t.bigint "timestamp", null: false
    t.boolean "is_initial_build", null: false
    t.string "machine_hostname", null: false
    t.string "machine_platform", null: false
    t.integer "machine_cpu_count", null: false
    t.bigint "machine_memory_total", null: false
    t.bigint "machine_memory_free", null: false
    t.string "process_node_version", null: false
    t.bigint "process_memory", null: false
    t.integer "build_files_count", null: false
    t.string "build_output_dir", null: false
    t.integer "build_error_count", null: false
    t.integer "build_warning_count", null: false
    t.string "build_entry_points", default: [], array: true
    t.jsonb "build_file_types", default: {}
    t.string "workspace_name", null: false
    t.string "workspace_project", null: false
    t.string "workspace_environment", null: false
    t.string "workspace_user", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "duration_ms", default: 0, null: false
    t.string "workspace_task"
    t.index ["timestamp"], name: "index_build_metrics_on_timestamp"
    t.index ["workspace_environment"], name: "index_build_metrics_on_workspace_environment"
    t.index ["workspace_project"], name: "index_build_metrics_on_workspace_project"
  end

  create_table "files_with_violations", force: :cascade do |t|
    t.bigint "analysis_job_id", null: false
    t.string "file_path", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["analysis_job_id", "file_path"], name: "index_files_with_violations_on_analysis_job_id_and_file_path", unique: true
    t.index ["analysis_job_id"], name: "index_files_with_violations_on_analysis_job_id"
  end

  create_table "projects", force: :cascade do |t|
    t.string "name", null: false
    t.string "repository_url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_projects_on_name", unique: true
  end

  create_table "severities", force: :cascade do |t|
    t.string "name", null: false
    t.integer "level", null: false
    t.string "color_code"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["level"], name: "index_severities_on_level", unique: true
    t.index ["name"], name: "index_severities_on_name", unique: true
  end

  create_table "violations", force: :cascade do |t|
    t.bigint "file_with_violations_id", null: false
    t.string "rule_id"
    t.string "rule_name", null: false
    t.text "description"
    t.integer "start_line", null: false
    t.integer "end_line", null: false
    t.integer "start_col"
    t.integer "end_col"
    t.jsonb "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "severity_id"
    t.index ["file_with_violations_id"], name: "index_violations_on_file_with_violations_id"
    t.index ["rule_id"], name: "index_violations_on_rule_id"
    t.index ["rule_name"], name: "index_violations_on_rule_name"
    t.index ["severity_id"], name: "index_violations_on_severity_id"
  end

  add_foreign_key "analysis_jobs", "projects"
  add_foreign_key "files_with_violations", "analysis_jobs"
  add_foreign_key "violations", "files_with_violations", column: "file_with_violations_id"
  add_foreign_key "violations", "severities"
end
