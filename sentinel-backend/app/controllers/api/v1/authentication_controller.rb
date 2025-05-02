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

        # Use the authentication params instead of root level params
        webauthn_params = params[:authentication].presence || params
        
        # Convert the received ID to URL-safe base64 with standard padding for comparison
        normalized_id = Base64.urlsafe_encode64(
          Base64.urlsafe_decode64(webauthn_params[:id].to_s.tr('=', ''))
        )
        credential = user.credentials.find_by(external_id: normalized_id)

        unless credential
          return render json: { error: "Credential not found" }, status: :not_found
        end

        begin
          # Create a clean params hash with properly encoded values
          formatted_params = {
            id: webauthn_params[:id],  # Ensure URL-safe base64 without padding
            raw_id: Base64.urlsafe_decode64(webauthn_params[:rawId].to_s),
            type: webauthn_params[:type],
            response: {
              authenticator_data: webauthn_params[:response][:authenticatorData],
              client_data_json: webauthn_params[:response][:clientDataJSON],
              signature: webauthn_params[:response][:signature]
            }
          }

          webauthn_credential = WebAuthn::Credential.from_get(formatted_params)

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
