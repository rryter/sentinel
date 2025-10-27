class NormalizeCredentialExternalIds < ActiveRecord::Migration[8.0]
  def up
    # Remove padding from all existing credential external_ids for consistency
    # This matches what browsers send during authentication
    Credential.find_each do |credential|
      if credential.external_id.present?
        # Remove trailing '=' padding characters
        normalized_id = credential.external_id.tr('=', '')
        credential.update_column(:external_id, normalized_id) if normalized_id != credential.external_id
      end
    end
  end

  def down
    # Re-add padding if needed (though this is not critical)
    Credential.find_each do |credential|
      if credential.external_id.present?
        padding_needed = (4 - credential.external_id.length % 4) % 4
        padded_id = credential.external_id + ('=' * padding_needed)
        credential.update_column(:external_id, padded_id) if padded_id != credential.external_id
      end
    end
  end
end
