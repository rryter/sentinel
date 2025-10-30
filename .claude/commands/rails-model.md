# Rails Model Generator

You are tasked with creating a new Rails model with migration and factory.

**User Request:** {{arg}}

## Process

### Step 1: Analyze and Confirm Requirements

Based on the user's request, determine:

1. **Model Name** (singular, PascalCase): What should the model be called? (e.g., `Task`, `Notification`, `UserSetting`)
2. **Table Name** (plural, snake_case): Database table name (e.g., `tasks`, `notifications`, `user_settings`)
3. **Model Attributes**: What fields does the model need?
   - Field name (snake_case)
   - Field type (string, text, integer, boolean, datetime, jsonb, references, etc.)
   - Default values if needed
   - Null constraints (null: true/false)
4. **Indexes**: Which fields need indexes? (foreign keys, frequently queried fields, unique constraints)
5. **Validations**: What validations are needed?
   - presence, uniqueness, format, length, numericality, inclusion, etc.
6. **Associations**: What relationships exist?
   - belongs_to, has_many, has_one, has_many :through, etc.
7. **Callbacks**: Are any callbacks needed? (before_save, after_create, etc.)
8. **Scopes**: Any useful query scopes? (e.g., `scope :active, -> { where(active: true) }`)

Use the AskUserQuestion tool to confirm these details if anything is unclear.

### Step 2: Generate Model and Migration

1. Navigate to sentinel-backend directory
2. Use Rails generator to create the model and migration:
   ```bash
   cd sentinel-backend
   bin/rails generate model {ModelName} {field1:type} {field2:type} ...
   ```

Example:
```bash
bin/rails generate model Task title:string description:text status:string project:references completed_at:datetime
```

### Step 3: Edit Migration

1. Open the generated migration file in `sentinel-backend/db/migrate/`
2. Add necessary enhancements:
   - Add indexes for foreign keys and frequently queried fields
   - Add unique constraints where needed
   - Add null constraints (null: false) for required fields
   - Add default values where appropriate
   - Add check constraints if needed (for enums, validations, etc.)

Example:
```ruby
class CreateTasks < ActiveRecord::Migration[7.0]
  def change
    create_table :tasks do |t|
      t.string :title, null: false
      t.text :description
      t.string :status, null: false, default: 'pending'
      t.references :project, null: false, foreign_key: true
      t.datetime :completed_at

      t.timestamps
    end

    add_index :tasks, :status
    add_index :tasks, [:project_id, :status]
  end
end
```

### Step 4: Edit Model

1. Open the generated model file in `sentinel-backend/app/models/`
2. Add validations following Rails conventions
3. Add associations
4. Add callbacks if needed
5. Add scopes for common queries
6. Add custom methods if needed

Example:
```ruby
class Task < ApplicationRecord
  # Associations
  belongs_to :project
  has_many :comments, dependent: :destroy

  # Validations
  validates :title, presence: true, length: { maximum: 255 }
  validates :status, presence: true, inclusion: { in: %w[pending in_progress completed] }

  # Scopes
  scope :completed, -> { where.not(completed_at: nil) }
  scope :pending, -> { where(status: 'pending') }
  scope :for_project, ->(project_id) { where(project_id: project_id) }

  # Callbacks
  before_save :set_completed_at, if: :status_changed_to_completed?

  private

  def status_changed_to_completed?
    status == 'completed' && status_changed?
  end

  def set_completed_at
    self.completed_at = Time.current
  end
end
```

### Step 5: Create FactoryBot Factory

1. Create the factory file at `sentinel-backend/spec/factories/{table_name}.rb`
2. Define realistic test data for all required fields
3. Add traits for common variations
4. Set up associations properly

Example:
```ruby
FactoryBot.define do
  factory :task do
    title { "Test Task" }
    description { "A test task description" }
    status { "pending" }
    association :project

    trait :completed do
      status { "completed" }
      completed_at { Time.current }
    end

    trait :in_progress do
      status { "in_progress" }
    end
  end
end
```

### Step 6: Create Model Spec

1. Create the model spec file at `sentinel-backend/spec/models/{model_name}_spec.rb`
2. Test validations, associations, scopes, and custom methods

Example:
```ruby
require 'rails_helper'

RSpec.describe Task, type: :model do
  describe 'associations' do
    it { should belong_to(:project) }
    it { should have_many(:comments).dependent(:destroy) }
  end

  describe 'validations' do
    it { should validate_presence_of(:title) }
    it { should validate_length_of(:title).is_at_most(255) }
    it { should validate_presence_of(:status) }
    it { should validate_inclusion_of(:status).in_array(%w[pending in_progress completed]) }
  end

  describe 'scopes' do
    let(:project) { create(:project) }
    let!(:completed_task) { create(:task, :completed, project: project) }
    let!(:pending_task) { create(:task, :pending, project: project) }

    it 'returns completed tasks' do
      expect(Task.completed).to include(completed_task)
      expect(Task.completed).not_to include(pending_task)
    end

    it 'returns pending tasks' do
      expect(Task.pending).to include(pending_task)
      expect(Task.pending).not_to include(completed_task)
    end
  end

  describe 'callbacks' do
    let(:task) { create(:task, status: 'pending') }

    it 'sets completed_at when status changes to completed' do
      expect {
        task.update(status: 'completed')
      }.to change { task.completed_at }.from(nil)
    end
  end
end
```

### Step 7: Run Migration

```bash
cd sentinel-backend
bundle exec rails db:migrate
```

### Step 8: Run Tests

```bash
cd sentinel-backend
bundle exec rspec spec/models/{model_name}_spec.rb
```

Fix any failing tests before proceeding.

## Important Notes

- **Follow Rails conventions**: Use singular model names, plural table names
- **Database constraints**: Use database-level constraints (NOT NULL, foreign keys, etc.)
- **Validation**: Add both database and model-level validations for defense in depth
- **Indexes**: Add indexes for foreign keys and frequently queried columns
- **Associations**: Define all relationships with proper dependencies
- **Factory data**: Make factory data realistic and use sequences for unique fields
- **Test coverage**: Test all validations, associations, scopes, and custom behavior

## Summary

After completion, provide a summary including:
- Model name and table name
- All attributes with types and constraints
- Validations and associations
- Any scopes or custom methods added
- Location of model, migration, factory, and spec files

IMPORTANT: DO NOT use the TodoWrite tool. Just complete the task step by step.
