module Api
  module V1
    class UserRegistrationController < ApplicationController
      include ActionController::MimeResponds
      
      def create
        user = User.new(email: user_params[:email] || "reto@twy.gmbh", password: '12345678')

        create_options = WebAuthn::Credential.options_for_create(
          user: {
            name: user.email,
            id: user.webauthn_id,
            display_name: user.email
          },
          rp: {
            name: "Sentinel App",
            id: request.host
          },
          authenticator_selection: { 
            user_verification: "required"
          }
        )

        if user.valid?
          session[:current_registration] = { 
            challenge: create_options.challenge, 
            user_attributes: user.attributes 
          }

          respond_to do |format|
            format.json { render json: create_options }
          end
        else
          respond_to do |format|
            format.json { render json: { errors: user.errors.full_messages }, status: :unprocessable_entity }
          end
        end
      end

      def register
        # Retrieve the challenge from session
        registration_data = session.delete(:current_registration)
        
        unless registration_data
          return render json: { error: "Registration session expired" }, status: :unprocessable_entity
        end
        
        # Create the user based on stored attributes
        user = User.new(registration_data["user_attributes"])
        
        begin
          # Verify the WebAuthn credential
          webauthn_credential = WebAuthn::Credential.from_create(params)
          
          # Verify that the challenge matches
          webauthn_credential.verify(registration_data["challenge"])
          
          # Save the credential to the database
          credential = user.credentials.build(
            external_id: Base64.strict_encode64(webauthn_credential.raw_id),
            public_key: webauthn_credential.public_key,
            nickname: "Default authentication"
          )
          
          user.save!
          
          # Set up a session or generate a JWT token
          # For now, we'll just return success
          render json: { 
            status: "success",
            user: {
              id: user.id,
              email: user.email
            }
          }
        rescue WebAuthn::Error => e
          render json: { error: e.message }, status: :unprocessable_entity
        rescue ActiveRecord::RecordInvalid
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def user_params
        params.require(:registration).permit(:email, :username)
      rescue ActionController::ParameterMissing
        {}
      end
    end
  end
end
