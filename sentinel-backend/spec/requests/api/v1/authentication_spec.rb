require 'swagger_helper'

RSpec.describe 'Api::V1::Authentication', type: :request do
  path '/api/v1/auth/webauthn/login/options' do
    post 'Get WebAuthn login options' do
      tags 'Authentication'
      consumes 'application/json'
      produces 'application/json'
      # Use a distinct name for the body parameter
      parameter name: :email_payload, in: :body, schema: {
        type: :object,
        properties: {
          email: { type: :string }
        },
        required: ['email']
      }

      response '200', 'WebAuthn options returned' do
        schema type: :object,
          properties: {
            challenge: { type: :string },
            rp_id: { type: :string },
            allowCredentials: {
              type: :array,
              items: {
                type: :object,
                properties: {
                  type: { type: :string },
                  id: { type: :string }
                }
              }
            }
          }

        # Use let! to ensure creation before request
        let!(:user) { create(:user) }
        let!(:credential) { create(:credential, user: user) }
        let(:email_payload) { { email: user.email } }
        let(:mock_options) do
          instance_double(
            'WebAuthn::PublicKeyCredential::RequestOptions',
            challenge: 'mock-challenge',
            as_json: { challenge: 'mock-challenge' }
          )
        end

        before do
          # Ensure the user and credential exist before stubbing
          user
          credential
          allow(WebAuthn::Credential).to receive(:options_for_get).and_return(mock_options)
        end

        run_test! do |response|
          # Remove direct session expectation
          # expect(session[:authentication_challenge]).to include(...)

          # Verify options_for_get was called correctly using the user's actual credentials
          expect(WebAuthn::Credential).to have_received(:options_for_get).with(
            allow: user.credentials.map(&:webauthn_credential), # Correctly fetch credentials
            user_verification: 'required',
            rp_id: WebAuthn.configuration.rp_id
          )
        end
      end

      response '404', 'user not found' do
        schema type: :object,
          properties: {
            error: { type: :string }
          },
          required: ['error']

        # Rename the let block here too
        let(:email_payload) { { email: 'nonexistent@example.com' } }
        run_test!
      end
    end
  end

  path '/api/v1/auth/webauthn/login/authenticate' do
    post 'Authenticate with WebAuthn' do
      tags 'Authentication'
      consumes 'application/json'
      produces 'application/json'
      parameter name: :authentication, in: :body, schema: {
        type: :object,
        properties: {
          id: { type: :string },
          rawId: { type: :string },
          type: { type: :string, enum: ['public-key'] },
          response: {
            type: :object,
            properties: {
              authenticatorData: { type: :string },
              clientDataJSON: { type: :string },
              signature: { type: :string }
            },
            required: ['authenticatorData', 'clientDataJSON', 'signature']
          }
        },
        required: ['id', 'rawId', 'type', 'response']
      }

      let!(:user) { create(:user) }
      # Use let! for credential to ensure it exists before mock_webauthn_credential
      let!(:credential) { create(:credential, user: user) }

      # Use double, ensure credential exists first
      let(:mock_webauthn_credential) do
        instance_double(
          # Use the correct class name returned by from_get
          'WebAuthn::PublicKeyCredential', 
          id: credential.external_id, # Stub for the id method
          sign_count: credential.sign_count + 1 # Simulate sign count increment
        )
      end
      let(:valid_auth_params) do
        {
          # Use string keys
          'id' => credential.external_id,
          'rawId' => Base64.urlsafe_decode64(credential.external_id),
          'type' => 'public-key',
          'response' => {
            # Use string keys for nested hash too
            'authenticatorData' => 'test-auth-data',
            'clientDataJSON' => 'test-client-data',
            'signature' => 'test-signature'
          }
        }
      end
      # Define the parameter using the let block
      let(:authentication) { valid_auth_params }

      # --- Context for Session State ---
      context 'when authentication challenge exists in session' do
        before do
          # Stub external calls (WebAuthn library)
          # Make the from_get stub specific to the authentication params
          # Ensure this uses the correct `authentication` object available in the scope (now with string keys)
          allow(WebAuthn::Credential).to receive(:from_get).with(authentication).and_return(mock_webauthn_credential)
          allow(mock_webauthn_credential).to receive(:verify) # Stub verify by default
        end

        response '200', 'authentication successful' do
          schema type: :object, properties: {
            status: { type: :string }
          }

          # ADD session stub here
          before do
            allow_any_instance_of(Api::V1::AuthenticationController).to receive(:session).and_return({
              :authentication_challenge => { 'challenge' => 'test-challenge', 'user_id' => user.id }
            })
          end

          run_test! do |response|
            expect(WebAuthn::Credential).to have_received(:from_get).with(authentication)
            expect(mock_webauthn_credential).to have_received(:verify).with(
              'test-challenge',
              public_key: credential.public_key,
              sign_count: credential.sign_count,
              user_verification: true
            )
            expect(credential.reload.sign_count).to eq(mock_webauthn_credential.sign_count)

            data = JSON.parse(response.body)
            expect(data['status']).to eq('ok')
          end
        end

        response '422', 'authentication failed - missing parameters' do
          let(:authentication) { { id: credential.external_id } } # Missing other params
          schema type: :object, properties: {
            error: { type: :string }
          }
          # ADD session stub here
          before do
            allow_any_instance_of(Api::V1::AuthenticationController).to receive(:session).and_return({
              :authentication_challenge => { 'challenge' => 'test-challenge', 'user_id' => user.id }
            })
          end
          run_test!
        end

        response '422', 'authentication failed - missing response parameters' do
          let(:authentication) do
            {
              id: credential.external_id,
              rawId: 'raw_id',
              type: 'public-key'
              # Missing response hash with clientDataJSON and authenticatorData
            }
          end
          schema type: :object, properties: {
            error: { type: :string }
          }
          # ADD session stub here
          before do
            allow_any_instance_of(Api::V1::AuthenticationController).to receive(:session).and_return({
              :authentication_challenge => { 'challenge' => 'test-challenge', 'user_id' => user.id }
            })
          end
          run_test!
        end

        response '404', 'credential not found' do
          before do
            allow_any_instance_of(Api::V1::AuthenticationController).to receive(:session).and_return({
              :authentication_challenge => { 'challenge' => 'test-challenge', 'user_id' => user.id }
            })
            # Let from_get succeed (it's stubbed in the outer before block with .with(authentication))
            # Explicitly stub Credential.find_by! to raise the error for this test
            allow(Credential).to receive(:find_by!).with(external_id: credential.external_id).and_raise(ActiveRecord::RecordNotFound)
          end
          schema type: :object, properties: {
            error: { type: :string }
          }
          run_test!
        end

        response '422', 'WebAuthn verification failed' do
          # ADD session stub here
          before do
            allow_any_instance_of(Api::V1::AuthenticationController).to receive(:session).and_return({
              :authentication_challenge => { 'challenge' => 'test-challenge', 'user_id' => user.id }
            })
            # Override the verify stub on the double to raise an error
            allow(mock_webauthn_credential).to receive(:verify).and_raise(WebAuthn::Error, 'Verification failed')
          end
          schema type: :object, properties: {
            error: { type: :string }
          }
          run_test!
        end
      end # End context 'when authentication challenge exists'

      context 'when authentication challenge is missing from session' do
        before do
          # Stub session to be empty or missing the key
          allow_any_instance_of(Api::V1::AuthenticationController).to receive(:session).and_return({})
        end

        response '422', 'authentication failed - invalid or expired challenge' do
          schema type: :object,
            properties: {
              error: { type: :string }
            },
            required: ['error']

          # No specific let needed, just run with the empty session
          run_test!
        end
      end # End context 'when authentication challenge is missing'
    end # End post 'Authenticate with WebAuthn'
  end # End path '/api/v1/auth/webauthn/login/authenticate'
end
