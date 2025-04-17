class CleanupPatternMatchesReferences < ActiveRecord::Migration[8.0]
  def up
    # This migration doesn't need to do anything to the database
    # It's a reminder to remove the old PatternMatch model and controller files:
    #
    # 1. app/models/pattern_match.rb
    # 2. app/controllers/api/v1/pattern_matches_controller.rb
    # 3. app/serializers/pattern_match_serializer.rb
    # 4. spec/factories/pattern_matches.rb
    # 5. spec/requests/api/v1/pattern_matches_spec.rb
    
    # Also update any frontend references to pattern_matches
  end

  def down
    # This migration is not reversible
  end
end 