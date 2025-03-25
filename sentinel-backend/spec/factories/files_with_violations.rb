FactoryBot.define do
  factory :file_with_violations do
    analysis_job
    sequence(:file_path) { |n| "app/models/model_#{n}.rb" }
  end
end 