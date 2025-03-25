FactoryBot.define do
  factory :project do
    sequence(:name) { |n| "Project #{n}" }
    sequence(:repository_url) { |n| "https://github.com/org/repo-#{n}" }
  end
end 