module Api
  module V1
    class UserRegistrationController < ApplicationController
      include ActionController::MimeResponds

      def create
        user = User.new(email: user_params[:email], password: "12345678")

        create_options = WebAuthn::Credential.options_for_create(
          user: {
            name: user.email,
            id: user.webauthn_id,
            display_name: user.email
          },
          rp: {
            name: "Scoper",
            id: case Rails.env
              when "production"
                "app.scoper.cloud"
              when "staging"
                "test.scoper.cloud"
              else
                "localhost"
            end
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

          # Call verify with just the challenge and optional user verification
          webauthn_credential.verify(
            registration_data["challenge"],
            user_verification: true
          )

          # Save the credential to the database using URL-safe base64 with standard padding
          credential = user.credentials.build(
            external_id: Base64.urlsafe_encode64(webauthn_credential.raw_id),
            public_key: webauthn_credential.public_key,
            nickname: "Default authentication",
            sign_count: webauthn_credential.sign_count || 0
          )
          user.password = "12345678"
          user.save!

          # Return success response
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
