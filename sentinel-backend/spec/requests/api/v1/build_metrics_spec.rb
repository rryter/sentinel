require 'rails_helper'

RSpec.describe "Api::V1::BuildMetrics", type: :request do
  describe "POST /api/v1/build_metrics" do
    let(:valid_headers) do
      {
        "Content-Type" => "application/json",
        "Accept" => "application/json"
      }
    end

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
              workspace_user: "rryter"
            }
          ]
        }
      end

      it "creates new build metrics" do
        expect {
          post "/api/v1/build_metrics", params: valid_attributes.to_json, headers: valid_headers
        }.to change(BuildMetric, :count).by(1)
        
        expect(response).to have_http_status(:success)
        
        # Verify data was stored correctly
        json_response = JSON.parse(response.body)
        expect(json_response["results"].first["status"]).to eq("success")
        
        # Retrieve the created record to verify fields
        build_metric = BuildMetric.last
        expect(build_metric.duration_ms).to eq(5781)
        expect(build_metric.is_initial_build).to eq(true)
        expect(build_metric.machine_hostname).to eq("ai-code")
        expect(build_metric.workspace_name).to eq("@sentinel/source")
        expect(build_metric.workspace_project).to eq("unknown")
        expect(build_metric.workspace_environment).to eq("development")
        expect(build_metric.workspace_user).to eq("rryter")
      end
    end

    context "with invalid parameters (missing required fields)" do
      let(:invalid_attributes) do
        {
          metrics: [
            {
              # Missing required fields
              timestamp: Time.current.iso8601,
              duration_ms: 5781,
              # Missing machine_hostname and other required fields
            }
          ]
        }
      end

      it "returns a 422 status with errors" do
        post "/api/v1/build_metrics", params: invalid_attributes.to_json, headers: valid_headers
        
        expect(response).to have_http_status(:unprocessable_entity)
        
        json_response = JSON.parse(response.body)
        expect(json_response["results"].first["status"]).to eq("error")
        expect(json_response["results"].first).to have_key("errors")
      end
    end

    context "with JSON syntax errors in request" do
      it "returns a 400 bad request status" do
        # Simulate the error in the original request with unquoted keys
        invalid_json = <<~JSON
        {
          "metrics": [
            {
              timestamp: "2025-04-30T13:58:25.494Z",
              duration_ms: 5781,
              is_initial_build: true,
              machine_hostname: "ai-code",
              machine_platform: "linux"
            }
          ]
        }
        JSON

        post "/api/v1/build_metrics", params: invalid_json, headers: valid_headers
        
        expect(response).to have_http_status(:bad_request)
      end
    end
  end
end
