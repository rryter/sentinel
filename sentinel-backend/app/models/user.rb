class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  
  has_many :credentials, dependent: :destroy
  
  # Generate a unique WebAuthn ID for the user
  def webauthn_id
    @webauthn_id ||= if self.id
                       Base64.strict_encode64([self.id].pack('L'))
                     else
                       # For new users, create a temporary ID
                       Base64.strict_encode64(SecureRandom.random_bytes(32))
                     end
  end
  
  def webauthn_options
    {
      id: webauthn_id,
      name: email,
      display_name: name || email,
      credentials: credentials.map(&:webauthn_credential)
    }
  end
end
