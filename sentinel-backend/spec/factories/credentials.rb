FactoryBot.define do
  factory :credential do
    association :user # Associate with a user by default
    sequence(:external_id) { |n| Base64.urlsafe_encode64("credential_#{n}", padding: false) } # Realistic external ID
    public_key { Base64.strict_encode64("fake_public_key_#{SecureRandom.hex(16)}") } # Realistic public key
    nickname { "Test Credential" }
    sign_count { 0 } # Default sign count
  end
end
