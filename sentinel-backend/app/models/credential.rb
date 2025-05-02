class Credential < ApplicationRecord
  belongs_to :user
  
  validates :external_id, presence: true, uniqueness: true
  validates :public_key, presence: true
  validates :nickname, presence: true
  
  # Return the credential in a format suitable for WebAuthn
  def webauthn_credential
    {
      id: external_id,
      public_key: public_key,
      nickname: nickname
    }
  end
end
