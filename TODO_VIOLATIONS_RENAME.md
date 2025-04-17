# TO-DO: Complete Pattern Matches to Violations Rename

## Backend Tasks

1. Run the updated migration to rename the table and recreate indices

```bash
cd sentinel-backend
rails db:migrate
```

2. Delete the old model/controller files:

- Delete app/models/pattern_match.rb
- Delete app/controllers/api/v1/pattern_matches_controller.rb
- Delete app/serializers/pattern_match_serializer.rb
- Delete spec/factories/pattern_matches.rb
- Delete spec/requests/api/v1/pattern_matches_spec.rb

3. Update OpenAPI swagger.json specification

- Update all references from `/api/v1/pattern_matches` to `/api/v1/violations`
- Update all references from `pattern_matches` to `violations` in schemas

## Frontend Tasks

The backend API endpoints have changed, so we need to generate new frontend API clients:

1. Generate new API clients based on updated OpenAPI spec

2. Rename frontend components:

- Rename components/pattern-matches-chart to components/violations-chart
- Rename components/job-pattern-matches to components/job-violations

3. Update all references in components and services

4. Update the routes where necessary

## Testing

After completing these tasks:

1. Start the backend:

```bash
cd sentinel-backend
rails s
```

2. Start the frontend:

```bash
cd sentinel-frontend
npm run dev
```

3. Test the functionality:

- Create a new analysis job
- View the job results
- Verify that violations are displayed correctly
- Verify that the charts and statistics work
