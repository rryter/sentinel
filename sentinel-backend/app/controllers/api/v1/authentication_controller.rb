module Api
  module V1
    class AuthenticationController < ApplicationController
      include ActionController::MimeResponds

      def webauthn_options
        user = User.find_by(email: params[:email])

        unless user
          return render json: { error: "User not found" }, status: :not_found
        end

        options = WebAuthn::Credential.options_for_get(
          allow: user.credentials.map(&:webauthn_credential),
          user_verification: "required",
          rp_id: "localhost"
        )

        session[:authentication_challenge] = {
          challenge: options.challenge,
          user_id: user.id
        }

        respond_to do |format|
          format.json { render json: options }
        end
      end

      def webauthn_authenticate
        auth_data = session.delete(:authentication_challenge)

        unless auth_data
          return render json: { error: "Authentication challenge expired" }, status: :unprocessable_entity
        end

        user = User.find(auth_data["user_id"])

        # Convert URL-safe base64 back to standard base64
        safe_id = params[:id].tr("-_", "+/").sub(/=+$/, "")  # Remove any trailing =
        credential_id = safe_id + ("=" * (4 - (safe_id.length % 4))) # Add padding back

        credential = user.credentials.find_by(external_id: credential_id)

        unless credential
          return render json: { error: "Credential not found" }, status: :not_found
        end

        begin
          webauthn_credential = WebAuthn::Credential.from_get(params)

          webauthn_credential.verify(
            auth_data["challenge"],
            public_key: credential.public_key,
            sign_count: credential.sign_count,
            user_verification: true
          )

          # Update sign count
          credential.update_sign_count(webauthn_credential.sign_count)

          # You might want to generate a JWT token here for subsequent API calls
          render json: {
            status: "success",
            user: {
              id: user.id,
              email: user.email
            }
          }
        rescue WebAuthn::Error => e
          render json: { error: e.message }, status: :unprocessable_entity
        end
      end
    end
  end
end
