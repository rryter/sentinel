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

ActiveRecord::Schema[8.0].define(version: 2025_05_02_114949) do
  create_table "analysis_jobs", charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.string "status", default: "pending", null: false
    t.decimal "files_per_second_wall_time", precision: 10
    t.decimal "files_per_second_cpu_time", precision: 10
    t.decimal "avg_time_per_file_ms", precision: 10
    t.integer "cumulative_processing_time_ms"
    t.integer "parallel_cores_used"
    t.decimal "parallel_speedup_factor", precision: 10
    t.decimal "parallel_efficiency_percent", precision: 10
    t.integer "total_files"
    t.integer "total_matches"
    t.integer "rules_matched"
    t.integer "duration"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_analysis_jobs_on_project_id"
    t.index ["status"], name: "index_analysis_jobs_on_status"
  end

  create_table "build_metrics", charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.datetime "timestamp", null: false
    t.integer "duration_ms", null: false
    t.boolean "is_initial_build", default: false, null: false
    t.string "machine_hostname", null: false
    t.string "machine_platform", null: false
    t.integer "machine_cpu_count", null: false
    t.bigint "machine_memory_total", null: false
    t.bigint "machine_memory_free", null: false
    t.string "process_node_version", null: false
    t.bigint "process_memory", null: false
    t.integer "build_files_count", null: false
    t.string "build_output_dir", null: false
    t.integer "build_error_count", default: 0, null: false
    t.integer "build_warning_count", default: 0, null: false
    t.string "workspace_name", null: false
    t.string "workspace_project", null: false
    t.string "workspace_environment", null: false
    t.string "workspace_user", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "build_entry_points"
    t.json "build_file_types"
    t.string "workspace_task"
    t.index ["timestamp"], name: "index_build_metrics_on_timestamp"
    t.index ["workspace_environment"], name: "index_build_metrics_on_workspace_environment"
    t.index ["workspace_project"], name: "index_build_metrics_on_workspace_project"
  end

  create_table "credentials", charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "external_id"
    t.text "public_key"
    t.string "nickname"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_credentials_on_user_id"
  end

  create_table "files_with_violations", charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "analysis_job_id", null: false
    t.string "file_path", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["analysis_job_id", "file_path"], name: "index_files_with_violations_on_analysis_job_id_and_file_path", unique: true
    t.index ["analysis_job_id"], name: "index_files_with_violations_on_analysis_job_id"
  end

  create_table "projects", charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "name", null: false
    t.string "repository_url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_projects_on_name", unique: true
  end

  create_table "severities", charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "name", null: false
    t.integer "level", null: false
    t.string "color_code"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["level"], name: "index_severities_on_level", unique: true
    t.index ["name"], name: "index_severities_on_name", unique: true
  end

  create_table "users", charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "name"
    t.string "webauthn_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "violations", charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "file_with_violations_id", null: false
    t.bigint "severity_id"
    t.string "rule_id"
    t.string "rule_name", null: false
    t.text "description"
    t.integer "start_line", null: false
    t.integer "end_line", null: false
    t.integer "start_col"
    t.integer "end_col"
    t.text "metadata_content"
    t.text "code_snippet"
    t.string "pattern_name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["file_with_violations_id", "rule_name", "start_line", "end_line"], name: "index_violations_on_file_rule_and_location", unique: true
    t.index ["severity_id"], name: "fk_rails_69ee6022c5"
  end

  add_foreign_key "analysis_jobs", "projects"
  add_foreign_key "credentials", "users"
  add_foreign_key "files_with_violations", "analysis_jobs"
  add_foreign_key "violations", "files_with_violations", column: "file_with_violations_id"
  add_foreign_key "violations", "severities"
end
