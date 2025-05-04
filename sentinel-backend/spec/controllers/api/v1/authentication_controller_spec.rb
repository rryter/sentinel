require 'rails_helper'

RSpec.describe Api::V1::AuthenticationController, type: :controller do
  describe 'POST #webauthn_options' do
    context 'when user exists' do
      let(:user) { create(:user) }
      let(:credential) { create(:credential, user: user) }
      let(:mock_options) do
        instance_double(
          'WebAuthn::PublicKeyCredential::RequestOptions',
          challenge: 'mock-challenge',
          as_json: { challenge: 'mock-challenge' }
        )
      end

      before do
        allow(WebAuthn::Credential).to receive(:options_for_get).and_return(mock_options)
      end

      it 'returns successful response with WebAuthn options' do
        post :webauthn_options, params: { email: user.email }, format: :json

        expect(response).to have_http_status(:success)
        expect(session[:authentication_challenge]).to include(
          challenge: 'mock-challenge',
          user_id: user.id
        )
      end

      it 'calls WebAuthn::Credential.options_for_get with correct parameters' do
        expect(WebAuthn::Credential).to receive(:options_for_get).with(
          allow: [credential.webauthn_credential],
          user_verification: 'required',
          rp_id: WebAuthn.configuration.rp_id
        )

        post :webauthn_options, params: { email: user.email }, format: :json
      end
    end

    context 'when user does not exist' do
      it 'returns not found status' do
        post :webauthn_options, params: { email: 'nonexistent@example.com' }, format: :json

        expect(response).to have_http_status(:not_found)
        expect(JSON.parse(response.body)).to include('error' => 'User not found')
      end
    end
  end

  describe 'POST #webauthn_authenticate' do
    let(:user) { create(:user) }
    let(:credential) { create(:credential, user: user, external_id: 'test-credential-id=') }
    let(:mock_webauthn_credential) do
      instance_double(
        'WebAuthn::Credential',
        sign_count: 1
      )
    end

    let(:valid_auth_params) do
      {
        id: 'test-credential-id',
        rawId: 'test-raw-id',
        type: 'public-key',
        response: {
          authenticatorData: 'test-auth-data',
          clientDataJSON: 'test-client-data',
          signature: 'test-signature'
        }
      }
    end

    before do
      session[:authentication_challenge] = {
        challenge: 'test-challenge',
        user_id: user.id
      }
    end

    context 'with valid parameters' do
      before do
        allow(WebAuthn::Credential).to receive(:from_get).and_return(mock_webauthn_credential)
        allow(mock_webauthn_credential).to receive(:verify)
      end

      it 'authenticates successfully' do
        post :webauthn_authenticate, params: { authentication: valid_auth_params }, format: :json

        expect(response).to have_http_status(:success)
        expect(JSON.parse(response.body)).to include(
          'status' => 'success',
          'user' => {
            'id' => user.id,
            'email' => user.email
          }
        )
      end

      it 'verifies the WebAuthn credential' do
        expect(mock_webauthn_credential).to receive(:verify).with(
          'test-challenge',
          public_key: credential.public_key,
          sign_count: credential.sign_count,
          user_verification: true
        )

        post :webauthn_authenticate, params: { authentication: valid_auth_params }, format: :json
      end

      it 'updates the credential sign count' do
        post :webauthn_authenticate, params: { authentication: valid_auth_params }, format: :json

        expect(credential.reload.sign_count).to eq(1)
      end
    end

    context 'with missing authentication challenge' do
      before { session.delete(:authentication_challenge) }

      it 'returns unprocessable entity status' do
        post :webauthn_authenticate, params: { authentication: valid_auth_params }, format: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)).to include(
          'error' => 'Authentication challenge expired or invalid'
        )
      end
    end

    context 'with missing required parameters' do
      let(:invalid_params) { valid_auth_params.except(:id) }

      it 'returns unprocessable entity status with error message' do
        post :webauthn_authenticate, params: { authentication: invalid_params }, format: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)['error']).to include('Missing required parameters: id')
      end
    end

    context 'with missing response parameters' do
      let(:invalid_params) do
        params = valid_auth_params.deep_dup
        params[:response].delete(:signature)
        params
      end

      it 'returns unprocessable entity status with error message' do
        post :webauthn_authenticate, params: { authentication: invalid_params }, format: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)['error']).to include('Missing required response parameters: signature')
      end
    end

    context 'with nonexistent credential' do
      let(:invalid_credential_params) do
        valid_auth_params.merge(id: 'nonexistent-credential')
      end

      it 'returns not found status' do
        post :webauthn_authenticate, params: { authentication: invalid_credential_params }, format: :json

        expect(response).to have_http_status(:not_found)
        expect(JSON.parse(response.body)).to include('error' => 'Credential not found')
      end
    end

    context 'when WebAuthn verification fails' do
      before do
        allow(WebAuthn::Credential).to receive(:from_get).and_return(mock_webauthn_credential)
        allow(mock_webauthn_credential).to receive(:verify).and_raise(WebAuthn::Error, 'Verification failed')
      end

      it 'returns unprocessable entity status with error message' do
        post :webauthn_authenticate, params: { authentication: valid_auth_params }, format: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)).to include('error' => 'Verification failed')
      end
    end
  end
end
