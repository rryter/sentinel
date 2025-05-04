require 'rails_helper'

RSpec.describe "Api::V1::BuildMetrics", type: :request do
  let(:valid_headers) do
    {
      "Content-Type" => "application/json",
      "Accept" => "application/json"
    }
  end

  describe "GET /api/v1/build_metrics" do
    let!(:build_metric) { create(:build_metric) }

    it "returns build metrics data" do
      get "/api/v1/build_metrics", headers: valid_headers

      expect(response).to have_http_status(:success)
      json_response = JSON.parse(response.body)
      
      # Check that the response has the expected structure
      expect(json_response).to include("metrics", "filters")
      expect(json_response["filters"]).to include("projects", "environments")
      
      # Verify metrics data
      metric = json_response["metrics"].first
      expect(metric).to include(
        "timestamp",
        "initial_builds",
        "hot_reloads",
        "system"
      )
    end

    context "with interval parameter" do
      it "returns metrics for the specified interval" do
        get "/api/v1/build_metrics?interval=1h", headers: valid_headers
        expect(response).to have_http_status(:success)
      end
    end

    context "with project filter" do
      let!(:project_metric) { create(:build_metric, workspace_project: "test-project") }

      it "returns metrics filtered by project" do
        get "/api/v1/build_metrics?project=test-project", headers: valid_headers
        expect(response).to have_http_status(:success)
        json_response = JSON.parse(response.body)
        expect(json_response["metrics"]).not_to be_empty
      end
    end
  end

  describe "POST /api/v1/build_metrics" do
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
              workspace_project: "unknown",
              workspace_environment: "development",
              workspace_user: "testuser"
            }
          ]
        }
      end

      it "creates new build metrics" do
        expect {
          post "/api/v1/build_metrics", params: valid_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(1)
        
        expect(response).to have_http_status(:created)
        
        # Verify response format
        json_response = JSON.parse(response.body)
        expect(json_response["results"].first["status"]).to eq("success")
        
        # Verify stored data
        build_metric = BuildMetric.last
        expect(build_metric.duration_ms).to eq(5781)
        expect(build_metric.is_initial_build).to eq(true)
        expect(build_metric.machine_hostname).to eq("ai-code")
        expect(build_metric.workspace_name).to eq("@sentinel/source")
        expect(build_metric.workspace_project).to eq("unknown")
        expect(build_metric.workspace_environment).to eq("development")
        expect(build_metric.workspace_user).to eq("testuser")
      end

      it "handles batch creation of multiple metrics" do
        valid_attributes[:metrics] << valid_attributes[:metrics].first.dup
        
        expect {
          post "/api/v1/build_metrics", params: valid_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(2)
        
        expect(response).to have_http_status(:created)
        json_response = JSON.parse(response.body)
        expect(json_response["results"].length).to eq(2)
        expect(json_response["results"].all? { |r| r["status"] == "success" }).to be true
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
        post "/api/v1/build_metrics", params: invalid_attributes.to_json, headers: valid_headers
        
        expect(response).to have_http_status(:unprocessable_entity)
        
        json_response = JSON.parse(response.body)
        expect(json_response["results"].first["status"]).to eq("error")
        expect(json_response["results"].first).to have_key("errors")
      end
    end

    context "with empty metrics array" do
      it "returns 400 bad request" do
        post "/api/v1/build_metrics", params: { metrics: [] }.to_json, headers: valid_headers
        expect(response).to have_http_status(:bad_request)
      end
    end

    context "with invalid JSON" do
      it "returns 400 bad request" do
        post "/api/v1/build_metrics", params: "invalid json", headers: valid_headers
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
              workspace_project: "unknown",
              workspace_environment: "development",
              workspace_user: "testuser"
            },
            {
              # Invalid metric (missing fields)
              timestamp: Time.current.iso8601,
              duration_ms: 5781
            }
          ]
        }
      end

      it "returns unprocessable_entity status and creates only valid metrics" do
        expect {
          post "/api/v1/build_metrics", params: mixed_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(1)
        
        expect(response).to have_http_status(:unprocessable_entity)
        
        json_response = JSON.parse(response.body)
        expect(json_response["results"].length).to eq(2)
        expect(json_response["results"].first["status"]).to eq("success")
        expect(json_response["results"].last["status"]).to eq("error")
      end
    end
  end
end
