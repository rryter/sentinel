FactoryBot.define do
  factory :severity do
    sequence(:name) { |n| ["error", "warning", "info", "off"][n % 4] }
    sequence(:level) { |n| [3, 2, 1, 0][n % 4] }
    sequence(:color_code) { |n| ["#FF0000", "#FFCC00", "#00CCFF", "#CCCCCC"][n % 4] }
    sequence(:description) { |n| [
      "Error level issues that must be fixed immediately",
      "Warning level issues that should be addressed",
      "Informational findings",
      "Disabled rules"
    ][n % 4] }
    
    trait :error do
      name { "error" }
      level { 3 }
      color_code { "#FF0000" }
      description { "Error level issues that must be fixed immediately" }
    end
    
    trait :warning do
      name { "warning" }
      level { 2 }
      color_code { "#FFCC00" }
      description { "Warning level issues that should be addressed" }
    end
    
    trait :info do
      name { "info" }
      level { 1 }
      color_code { "#00CCFF" }
      description { "Informational findings" }
    end
    
    trait :off do
      name { "off" }
      level { 0 }
      color_code { "#CCCCCC" }
      description { "Disabled rules" }
    end
  end
end 