class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  has_many :credentials, dependent: :destroy
         
  before_create :set_webauthn_id

  private

  def set_webauthn_id
    self.webauthn_id ||= WebAuthn.generate_user_id
  end
end
