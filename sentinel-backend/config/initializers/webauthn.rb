WebAuthn.configure do |config|
  # This value needs to match `window.location.origin` evaluated by
  # the User Agent during registration and authentication ceremonies.
  config.allowed_origins = case Rails.env
    when "production"
      ["https://app.scoper.cloud"]
    when "staging"
      ["https://test.scoper.cloud"]
    else
      ["http://localhost:3000", "http://localhost:4200"]
  end

  # Relying Party name for display purposes
  config.rp_name = "Scoper - Observability"

  # Set environment-specific RP ID
  config.rp_id = case Rails.env
    when "production"
      "app.scoper.cloud"
    when "staging"
      "test.scoper.cloud"
    else
      "localhost"
  end

  # Optionally configure a client timeout hint, in milliseconds.
  # This hint specifies how long the browser should wait for any
  # interaction with the user.
  # This hint may be overridden by the browser.
  # https://www.w3.org/TR/webauthn/#dom-publickeycredentialcreationoptions-timeout
  # config.credential_options_timeout = 120_000

  # You can optionally specify a different Relying Party ID
  # (https://www.w3.org/TR/webauthn/#relying-party-identifier)
  # if it differs from the default one.
  #
  # In this case the default would be "auth.example.com", but you can set it to
  # the suffix "example.com"
  #
  # config.rp_id = "example.com"

  # Configure preferred binary-to-text encoding scheme. This should match the encoding scheme
  # used in your client-side (user agent) code before sending the credential to the server.
  # Supported values: `:base64url` (default), `:base64` or `false` to disable all encoding.
  #
  # config.encoding = :base64url

  # Possible values: "ES256", "ES384", "ES512", "PS256", "PS384", "PS512", "RS256", "RS384", "RS512", "RS1"
  # Default: ["ES256", "PS256", "RS256"]
  #
  # config.algorithms << "ES384"

  # You can also use an environment variable to override the RP ID if needed
  if ENV["WEBAUTHN_RP_ID"].present?
    config.rp_id = ENV["WEBAUTHN_RP_ID"]
  end
end