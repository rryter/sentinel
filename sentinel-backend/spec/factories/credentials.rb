FactoryBot.define do
  factory :credential do
    user { nil }
    external_id { "MyString" }
    public_key { "MyText" }
    nickname { "MyString" }
  end
end
