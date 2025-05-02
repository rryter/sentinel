class Credential < ActiveRecord::Base
  belongs_to :user
  
  validates :external_id, presence: true, uniqueness: true
  validates :public_key, presence: true
  validates :nickname, presence: true
  validates :sign_count, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  
  # Return the credential in a format suitable for WebAuthn
  def webauthn_credential
    {
      id: external_id,
      public_key: public_key,
      sign_count: sign_count
    }
  end

  # Update the sign count after successful authentication
  def update_sign_count(new_sign_count)
    if new_sign_count > sign_count
      update(sign_count: new_sign_count)
    else
      Rails.logger.warn "Received sign_count #{new_sign_count} is less than or equal to stored count #{sign_count}"
      false
    end
  end
end
