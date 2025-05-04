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
          rp_id: WebAuthn.configuration.rp_id
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
          return render json: { error: "Authentication challenge expired or invalid" }, status: :unprocessable_entity
        end

        user = User.find(auth_data["user_id"])

        # Use the authentication params instead of root level params
        webauthn_params = params[:authentication].presence || params

        # Validate required parameters
        required_params = [:id, :rawId, :type, :response]
        missing_params = required_params.select { |param| webauthn_params[param].blank? }
        
        if missing_params.any?
          return render json: { 
            error: "Missing required parameters: #{missing_params.join(', ')}"
          }, status: :unprocessable_entity
        end

        # Validate response parameters
        required_response_params = [:authenticatorData, :clientDataJSON, :signature]
        missing_response_params = required_response_params.select { |param| 
          webauthn_params[:response][param].blank? 
        }

        if missing_response_params.any?
          return render json: { 
            error: "Missing required response parameters: #{missing_response_params.join(', ')}"
          }, status: :unprocessable_entity
        end

        # Find the credential using the URL-safe base64 ID - this matches how we store it during registration
        credential_id = webauthn_params[:id] + "="
        credential = user.credentials.find_by(external_id: credential_id)

        unless credential
          return render json: { error: "Credential not found" }, status: :not_found
        end

        begin
          webauthn_credential = WebAuthn::Credential.from_get(webauthn_params)

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
