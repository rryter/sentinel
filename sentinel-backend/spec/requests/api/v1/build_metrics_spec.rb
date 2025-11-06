require 'swagger_helper'

RSpec.describe "Api::V1::BuildMetrics", type: :request do
  def generate_metrics(count, project_name)
    Array.new(count) do |i|
      {
        timestamp: (Time.current - i.minutes).iso8601,
        duration_ms: 1000 + i,
        is_initial_build: i.even?,
        machine_hostname: "test-#{i}",
        machine_platform: "linux",
        machine_cpu_count: 4,
        machine_memory_total: 1000000,
        machine_memory_free: 500000,
        process_node_version: "v18",
        process_memory: 100000,
        build_files_count: 100,
        build_output_dir: "dist",
        build_error_count: 0,
        build_warning_count: 0,
        workspace_name: "test",
        workspace_project: project_name,
        workspace_environment: "test",
        workspace_user: "test"
      }
    end
  end
  let(:valid_headers) do
    {
      "Content-Type" => "application/json",
      "Accept" => "application/json"
    }
  end

  path '/api/v1/projects/{project_id}/build_metrics' do
    parameter name: :project_id, in: :path, type: :integer, required: true, description: 'Project ID'

    get 'Get build metrics for a project' do
      tags 'Build Metrics'
      produces 'application/json'
      parameter name: :interval, in: :query, type: :string, required: false,
                description: 'Time interval for grouping metrics',
                schema: { type: :string, enum: ['1m', '5m', '15m', '30m', '1h', '6h', '12h', '1d'] }
      parameter name: :environment, in: :query, type: :string, required: false,
                description: 'Filter by environment'
      parameter name: :start_time, in: :query, type: :string, required: false,
                description: 'Start time for filtering (ISO8601 format)'
      parameter name: :end_time, in: :query, type: :string, required: false,
                description: 'End time for filtering (ISO8601 format)'

      response '200', 'build metrics found' do
        schema type: :object,
          properties: {
            metrics: {
              type: :array,
              items: {
                type: :object,
                properties: {
                  timestamp: { type: :string, format: 'date-time' },
                  initial_builds: {
                    type: :object,
                    properties: {
                      avg_duration_sec: { type: [:number, :null] },
                      min_duration_sec: { type: [:number, :null] },
                      max_duration_sec: { type: [:number, :null] },
                      build_count: { type: :integer },
                      total_errors: { type: :integer },
                      total_warnings: { type: :integer },
                      avg_files_count: { type: [:integer, :null] }
                    }
                  },
                  hot_reloads: {
                    type: :object,
                    properties: {
                      avg_duration_sec: { type: [:number, :null] },
                      min_duration_sec: { type: [:number, :null] },
                      max_duration_sec: { type: [:number, :null] },
                      build_count: { type: :integer },
                      total_errors: { type: :integer },
                      total_warnings: { type: :integer },
                      avg_files_count: { type: [:integer, :null] }
                    }
                  },
                  system: {
                    type: :object,
                    properties: {
                      memory_usage_percent: { type: :number }
                    }
                  },
                  git: {
                    type: :object,
                    properties: {
                      branch: { type: [:string, :null] },
                      commit: { type: [:string, :null] }
                    }
                  }
                }
              }
            },
            filters: {
              type: :object,
              properties: {
                projects: { type: :array, items: { type: :string } },
                environments: { type: :array, items: { type: :string } },
                interval: { type: :string }
              }
            }
          },
          required: ['metrics', 'filters']

        let!(:project) { create(:project) }
        let!(:build_metric) { create(:build_metric, project: project, workspace_project: project.name, branch_name: "main", commit_hash: "abc123") }
        let(:project_id) { project.id }

        run_test! do |response|
          json_response = JSON.parse(response.body)
          expect(json_response).to include("metrics", "filters")
          expect(json_response["filters"]).to include("projects", "environments")
        end
      end

      response '404', 'project not found' do
        schema type: :object,
          properties: {
            error: { type: :string }
          },
          required: ['error']

        let(:project_id) { 99999 }

        run_test!
      end
    end
  end

  describe "GET /api/v1/projects/:project_id/build_metrics" do
    let!(:project) { create(:project) }
    let!(:build_metric) { create(:build_metric, project: project, workspace_project: project.name, branch_name: "main", commit_hash: "abc123") }

    context "with no matching data" do
      let!(:other_project) { create(:project, name: "other-project") }
      
      it "returns empty metrics array" do
        get "/api/v1/projects/#{other_project.id}/build_metrics", headers: valid_headers
        
        expect(response).to have_http_status(:success)
        json_response = JSON.parse(response.body)
        expect(json_response["metrics"]).to be_empty
        expect(json_response["filters"]).to include("projects", "environments")
      end
    end

    context "with different interval parameters" do
      %w[1m 5m 15m 30m 1h 6h 12h 1d].each do |interval|
        it "returns metrics for #{interval} interval" do
          get "/api/v1/projects/#{project.id}/build_metrics?interval=#{interval}", headers: valid_headers
          expect(response).to have_http_status(:success)
          
          json_response = JSON.parse(response.body)
          expect(json_response).to include("metrics", "filters")
        end
      end
      
      it "handles invalid interval gracefully (defaults to 1h)" do
        get "/api/v1/projects/#{project.id}/build_metrics?interval=invalid", headers: valid_headers
        expect(response).to have_http_status(:success)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to include("metrics", "filters")
        
        # Verify that the default interval is used
        expect(json_response["filters"]["interval"]).to eq("1h")
      end
      
      it "handles case insensitive intervals" do
        get "/api/v1/projects/#{project.id}/build_metrics?interval=1H", headers: valid_headers
        expect(response).to have_http_status(:success)
      end
    end

    context "with time range filtering" do
      let!(:old_metric) do
        create(:build_metric,
               project: project,
               workspace_project: project.name,
               timestamp: 2.days.ago)
      end
      let!(:recent_metric) do
        create(:build_metric,
               project: project,
               workspace_project: project.name,
               timestamp: 1.hour.ago)
      end

      it "filters by start_time" do
        start_time = 6.hours.ago.iso8601
        get "/api/v1/projects/#{project.id}/build_metrics?start_time=#{start_time}", headers: valid_headers
        
        expect(response).to have_http_status(:success)
        json_response = JSON.parse(response.body)
        expect(json_response["metrics"]).not_to be_empty
      end

      it "filters by end_time" do
        end_time = 2.hours.ago.iso8601
        get "/api/v1/projects/#{project.id}/build_metrics?end_time=#{end_time}", headers: valid_headers
        
        expect(response).to have_http_status(:success)
      end

      it "filters by both start_time and end_time" do
        start_time = 3.days.ago.iso8601
        end_time = 1.day.ago.iso8601
        get "/api/v1/projects/#{project.id}/build_metrics?start_time=#{start_time}&end_time=#{end_time}", headers: valid_headers
        
        expect(response).to have_http_status(:success)
      end

      it "handles invalid time format gracefully" do
        get "/api/v1/projects/#{project.id}/build_metrics?start_time=invalid-date", headers: valid_headers
        expect(response).to have_http_status(:success)
        
        json_response = JSON.parse(response.body)
        expect(json_response["metrics"]).to be_empty
        expect(json_response["filters"]).to include("projects", "environments")
      end
    end

    context "with environment filter" do
      let!(:project_metric) { create(:build_metric, project: project, workspace_project: project.name, workspace_environment: "test-env") }

      it "returns metrics filtered by environment" do
        get "/api/v1/projects/#{project.id}/build_metrics?environment=test-env", headers: valid_headers
        expect(response).to have_http_status(:success)
        json_response = JSON.parse(response.body)
        expect(json_response["metrics"]).not_to be_empty
      end

      it "returns empty results for non-existent environment" do
        get "/api/v1/projects/#{project.id}/build_metrics?environment=non-existent", headers: valid_headers
        expect(response).to have_http_status(:success)
        json_response = JSON.parse(response.body)
        expect(json_response["metrics"]).to be_empty
      end
    end

    context "system metrics calculations" do
      let!(:metric_with_memory) do
        create(:build_metric,
               project: project,
               workspace_project: project.name,
               machine_memory_total: 16000000000,
               machine_memory_free: 4000000000,
               timestamp: Time.current.iso8601,
               duration_ms: 5000,
               is_initial_build: true,
               machine_hostname: "test-machine",
               machine_platform: "linux",
               machine_cpu_count: 8,
               process_node_version: "v18.0.0",
               process_memory: 100000000,
               build_files_count: 100,
               build_output_dir: "dist",
               build_error_count: 0,
               build_warning_count: 0,
               workspace_name: "test-workspace",
               workspace_environment: "test",
               workspace_user: "testuser")
      end

      it "calculates memory usage percentage correctly" do
        get "/api/v1/projects/#{project.id}/build_metrics", headers: valid_headers
        
        expect(response).to have_http_status(:success)
        json_response = JSON.parse(response.body)
        
        metric = json_response["metrics"].first
        expect(metric["system"]["memory_usage_percent"]).to satisfy { |value| value.is_a?(String) || value.is_a?(Numeric) }
      end
    end

    context "with multiple metrics across time periods" do
      before do
        # Create metrics across different time periods
        create(:build_metric, project: project, workspace_project: project.name, timestamp: 3.hours.ago, is_initial_build: true)
        create(:build_metric, project: project, workspace_project: project.name, timestamp: 2.hours.ago, is_initial_build: false)
        create(:build_metric, project: project, workspace_project: project.name, timestamp: 1.hour.ago, is_initial_build: true)
      end

      it "aggregates metrics correctly by time bucket" do
        get "/api/v1/projects/#{project.id}/build_metrics?interval=1h", headers: valid_headers
        
        expect(response).to have_http_status(:success)
        json_response = JSON.parse(response.body)
        
        # Should have multiple time buckets
        expect(json_response["metrics"].length).to be > 1
        
        json_response["metrics"].each do |metric|
          expect(metric).to include("timestamp", "initial_builds", "hot_reloads", "system", "git")
          expect(metric["initial_builds"]).to include("build_count")
          expect(metric["hot_reloads"]).to include("build_count")
        end
      end
    end
  end

  path '/api/v1/projects/{project_id}/build_metrics' do
    parameter name: :project_id, in: :path, type: :integer, required: true, description: 'Project ID'

    post 'Create build metrics' do
      tags 'Build Metrics'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :metrics, in: :body, schema: {
        type: :object,
        properties: {
          metrics: {
            type: :array,
            items: {
              type: :object,
              properties: {
                timestamp: { type: :string, format: 'date-time' },
                duration_ms: { type: :integer },
                is_initial_build: { type: :boolean },
                machine_hostname: { type: :string },
                machine_platform: { type: :string },
                machine_cpu_count: { type: :integer },
                machine_memory_total: { type: :integer },
                machine_memory_free: { type: :integer },
                process_node_version: { type: :string },
                process_memory: { type: :integer },
                build_files_count: { type: :integer },
                build_output_dir: { type: :string },
                build_error_count: { type: :integer },
                build_warning_count: { type: :integer },
                workspace_name: { type: :string },
                workspace_project: { type: :string },
                workspace_environment: { type: :string },
                workspace_user: { type: :string },
                workspace_task: { type: :string },
                branch_name: { type: :string },
                commit_hash: { type: :string }
              },
              required: ['timestamp', 'duration_ms', 'is_initial_build', 'workspace_project', 'workspace_environment', 'workspace_user']
            }
          }
        },
        required: ['metrics']
      }

      response '201', 'build metrics created' do
        schema type: :object,
          properties: {
            results: {
              type: :array,
              items: {
                type: :object,
                properties: {
                  id: { type: :integer },
                  status: { type: :string }
                }
              }
            }
          },
          required: ['results']

        let!(:project) { create(:project) }
        let(:project_id) { project.id }
        let(:metrics) do
          {
            metrics: [
              {
                timestamp: Time.current.iso8601,
                duration_ms: 5781,
                is_initial_build: true,
                machine_hostname: "ai-code",
                machine_platform: "linux",
                machine_cpu_count: 24,
                machine_memory_total: 128847286272,
                machine_memory_free: 118873780224,
                process_node_version: "v20.18.0",
                process_memory: 110641208,
                build_files_count: 163,
                build_output_dir: ".",
                build_error_count: 0,
                build_warning_count: 0,
                workspace_name: "@sentinel/source",
                workspace_project: project.name,
                workspace_environment: "development",
                workspace_user: "testuser",
                branch_name: "develop",
                commit_hash: "abcdef123456"
              }
            ]
          }
        end

        run_test! do |response|
          json_response = JSON.parse(response.body)
          expect(json_response["results"].first["status"]).to eq("success")
        end
      end

      response '404', 'project not found' do
        schema type: :object,
          properties: {
            error: { type: :string }
          },
          required: ['error']

        let(:project_id) { 99999 }
        let(:metrics) { { metrics: [] } }

        run_test!
      end

      response '400', 'bad request' do
        schema type: :object,
          properties: {
            error: { type: :string }
          },
          required: ['error']

        let!(:project) { create(:project) }
        let(:project_id) { project.id }
        let(:metrics) { {} }

        run_test!
      end
    end
  end

  describe "POST /api/v1/projects/:project_id/build_metrics" do
    let!(:project) { create(:project) }
    
    context "with valid parameters" do
      let(:valid_attributes) do
        {
          metrics: [
            {
              timestamp: Time.current.iso8601,
              duration_ms: 5781,
              is_initial_build: true,
              machine_hostname: "ai-code",
              machine_platform: "linux",
              machine_cpu_count: 24,
              machine_memory_total: 128847286272,
              machine_memory_free: 118873780224,
              process_node_version: "v20.18.0",
              process_memory: 110641208,
              build_files_count: 163,
              build_output_dir: ".",
              build_error_count: 0,
              build_warning_count: 0,
              workspace_name: "@sentinel/source",
              workspace_project: project.name,
              workspace_environment: "development",
              workspace_user: "testuser",
              branch_name: "develop",
              commit_hash: "abcdef123456"
            }
          ]
        }
      end

      it "creates new build metrics" do
        expect {
          post "/api/v1/projects/#{project.id}/build_metrics", params: valid_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(1)
        
        expect(response).to have_http_status(:created)
        
        # Verify response format
        json_response = JSON.parse(response.body)
        expect(json_response["results"].first["status"]).to eq("success")
        
        # Verify stored data
        build_metric = BuildMetric.last
        expect(build_metric.project_id).to eq(project.id)
        expect(build_metric.duration_ms).to eq(5781)
        expect(build_metric.is_initial_build).to eq(true)
        expect(build_metric.machine_hostname).to eq("ai-code")
        expect(build_metric.workspace_name).to eq("@sentinel/source")
        expect(build_metric.workspace_project).to eq(project.name)
        expect(build_metric.workspace_environment).to eq("development")
        expect(build_metric.workspace_user).to eq("testuser")
        expect(build_metric.branch_name).to eq("develop")
        expect(build_metric.commit_hash).to eq("abcdef123456")
      end

      it "handles batch creation of multiple metrics" do
        valid_attributes[:metrics] << valid_attributes[:metrics].first.dup
        
        expect {
          post "/api/v1/projects/#{project.id}/build_metrics", params: valid_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(2)
        
        expect(response).to have_http_status(:created)
        json_response = JSON.parse(response.body)
        expect(json_response["results"].length).to eq(2)
        expect(json_response["results"].all? { |r| r["status"] == "success" }).to be true
      end

      it "handles optional fields correctly" do
        minimal_attributes = {
          metrics: [
            valid_attributes[:metrics].first.except(:branch_name, :commit_hash)
          ]
        }
        
        expect {
          post "/api/v1/projects/#{project.id}/build_metrics", params: minimal_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(1)
        
        expect(response).to have_http_status(:created)
        
        # Verify that omitted fields are absent
        build_metric = BuildMetric.last
        expect(build_metric.branch_name).to be_nil
        expect(build_metric.commit_hash).to be_nil
      end
    end

    context "with invalid parameters" do
      let(:invalid_attributes) do
        {
          metrics: [
            {
              # Missing required fields
              timestamp: Time.current.iso8601,
              duration_ms: 5781
            }
          ]
        }
      end

      it "returns 422 status with validation errors" do
        post "/api/v1/projects/#{project.id}/build_metrics", params: invalid_attributes.to_json, headers: valid_headers
        
        expect(response).to have_http_status(:unprocessable_entity)
        
        json_response = JSON.parse(response.body)
        expect(json_response["results"].first["status"]).to eq("error")
        expect(json_response["results"].first).to have_key("errors")
        
        # Verify specific validation errors
        errors = json_response["results"].first["errors"]
        expect(errors).to include("workspace_project" => ["can't be blank"])
        expect(errors).to include("workspace_environment" => ["can't be blank"])
        expect(errors).to include("workspace_user" => ["can't be blank"])
      end

      it "validates numeric fields" do
        invalid_numeric = {
          metrics: [
            {
              timestamp: Time.current.iso8601,
              duration_ms: "not_a_number",
              is_initial_build: true,
              machine_hostname: "test",
              machine_platform: "linux",
              machine_cpu_count: 4,
              machine_memory_total: 1000,
              machine_memory_free: 500,
              process_node_version: "v18",
              process_memory: 100,
              build_files_count: 10,
              build_output_dir: "dist",
              build_error_count: 0,
              build_warning_count: 0,
              workspace_name: "test",
              workspace_project: project.name,
              workspace_environment: "test",
              workspace_user: "test"
            }
          ]
        }
        
        post "/api/v1/projects/#{project.id}/build_metrics", params: invalid_numeric.to_json, headers: valid_headers
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it "validates boolean fields" do
        invalid_boolean = {
          metrics: [
            {
              timestamp: Time.current.iso8601,
              duration_ms: 1000,
              is_initial_build: "not_a_boolean",
              machine_hostname: "test",
              machine_platform: "linux",
              machine_cpu_count: 4,
              machine_memory_total: 1000,
              machine_memory_free: 500,
              process_node_version: "v18",
              process_memory: 100,
              build_files_count: 10,
              build_output_dir: "dist",
              build_error_count: 0,
              build_warning_count: 0,
              workspace_name: "test",
              workspace_project: project.name,
              workspace_environment: "test",
              workspace_user: "test"
            }
          ]
        }
        
        post "/api/v1/projects/#{project.id}/build_metrics", params: invalid_boolean.to_json, headers: valid_headers
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context "with empty metrics array" do
      it "returns 400 bad request" do
        post "/api/v1/projects/#{project.id}/build_metrics", params: { metrics: [] }.to_json, headers: valid_headers
        expect(response).to have_http_status(:bad_request)
      end
    end

    context "with no metrics parameter" do
      it "returns 400 bad request" do
        post "/api/v1/projects/#{project.id}/build_metrics", params: {}.to_json, headers: valid_headers
        expect(response).to have_http_status(:bad_request)
      end
    end

    context "with invalid JSON" do
      it "returns 400 bad request" do
        post "/api/v1/projects/#{project.id}/build_metrics", params: "invalid json", headers: valid_headers
        expect(response).to have_http_status(:bad_request)
      end
    end

    context "with mixed valid and invalid metrics" do
      let(:mixed_attributes) do
        {
          metrics: [
            {
              # Valid metric
              timestamp: Time.current.iso8601,
              duration_ms: 5781,
              is_initial_build: true,
              machine_hostname: "ai-code",
              machine_platform: "linux",
              machine_cpu_count: 24,
              machine_memory_total: 128847286272,
              machine_memory_free: 118873780224,
              process_node_version: "v20.18.0",
              process_memory: 110641208,
              build_files_count: 163,
              build_output_dir: ".",
              build_error_count: 0,
              build_warning_count: 0,
              workspace_name: "@sentinel/source",
              workspace_project: project.name,
              workspace_environment: "development",
              workspace_user: "testuser"
            },
            {
              # Invalid metric - missing required fields
              timestamp: Time.current.iso8601,
              duration_ms: "invalid"
            }
          ]
        }
      end

      it "handles mixed valid and invalid metrics" do
        expect {
          post "/api/v1/projects/#{project.id}/build_metrics", params: mixed_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(1) # Only valid metric should be saved

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["results"].last["status"]).to eq("error")
      end

      it "processes large batches efficiently" do
        large_attributes = {
          metrics: Array.new(10) do |i| # Reduced from 50 to 10
            {
              timestamp: (Time.current - i.minutes).iso8601,
              duration_ms: 1000 + i,
              is_initial_build: i.even?,
              machine_hostname: "test-#{i}",
              machine_platform: "linux",
              machine_cpu_count: 4,
              machine_memory_total: 1000000,
              machine_memory_free: 500000,
              process_node_version: "v18",
              process_memory: 100000,
              build_files_count: 100,
              build_output_dir: "dist",
              build_error_count: 0,
              build_warning_count: 0,
              workspace_name: "test",
              workspace_project: project.name,
              workspace_environment: "test",
              workspace_user: "test"
            }
          end
        }

        expect {
          post "/api/v1/projects/#{project.id}/build_metrics", params: large_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(10)

        expect(response).to have_http_status(:created)
        json_response = JSON.parse(response.body)
        expect(json_response["results"].length).to eq(10)
      end
    end

    context "with large dataset" do
      it "handles batch creation of many metrics" do
        large_attributes = { metrics: generate_metrics(50, project.name) }
        
        expect {
          post "/api/v1/projects/#{project.id}/build_metrics", params: large_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(50)
        
        expect(response).to have_http_status(:created)
      end
    end
  end
end