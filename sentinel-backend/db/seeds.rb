# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# Create severities
puts 'Seeding severities...'

Severity.find_or_create_by!(name: 'error') do |severity|
  severity.level = 3
  severity.color_code = '#DC2626' # Tailwind red-600
  severity.description = 'Critical issues that need immediate attention'
end

Severity.find_or_create_by!(name: 'warning') do |severity|
  severity.level = 2
  severity.color_code = '#F59E0B' # Tailwind amber-500
  severity.description = 'Potential issues that should be reviewed'
end

Severity.find_or_create_by!(name: 'info') do |severity|
  severity.level = 1
  severity.color_code = '#3B82F6' # Tailwind blue-500
  severity.description = 'Informational messages for awareness'
end

puts 'Severities seeded successfully!'

# Create Rule Groups
puts 'Seeding Rule Groups...'
angular_group = RuleGroup.find_or_create_by!(name: 'Angular') do |group|
  group.description = 'Rules related to Angular best practices and potential issues.'
  puts "Created rule group: #{group.name}"
end

typescript_group = RuleGroup.find_or_create_by!(name: 'TypeScript') do |group|
  group.description = 'Rules related to TypeScript best practices and potential issues.'
  puts "Created rule group: #{group.name}"
end
puts 'Rule Groups seeded successfully!'

# Create rules
puts 'Seeding rules...'

# Find the default severity for rules, or create it if it doesn't exist
warning_severity = Severity.find_or_create_by!(name: 'warning') do |severity|
  severity.level = 2
  severity.color_code = '#F59E0B' # Tailwind amber-500
  severity.description = 'Potential issues that should be reviewed'
end

rules_data = [
  {
    name: 'angular-legacy-decorators-rule',
    description: 'Detects usage of legacy Angular decorators that should be replaced with signal-based alternatives',
    severity: warning_severity,
    default_config: '{}',
    enabled_by_default: true,
    group: angular_group # Assign RuleGroup object
  },
  {
    name: 'angular-obsolete-standalone-true-rule',
    description: "Obsolete 'standalone: true' property detected",
    severity: warning_severity,
    default_config: '{}',
    enabled_by_default: true,
    group: angular_group # Assign RuleGroup object
  },
  {
    name: 'angular-output-event-collision-rule',
    description: 'Prevents naming collisions between Angular outputs and native DOM events',
    severity: warning_severity,
    default_config: '{}',
    enabled_by_default: true,
    group: angular_group # Assign RuleGroup object
  },
  {
    name: 'type-script-non-null-assertion-rule',
    description: "Disallows TypeScript's non-null assertion operator",
    severity: warning_severity,
    default_config: '{"skipInTests": false}',
    enabled_by_default: true,
    group: typescript_group # Assign RuleGroup object
  },
  {
    name: 'type-script-assertion-rule',
    description: 'Disallows unsafe TypeScript type assertions and non-null assertions',
    severity: warning_severity,
    default_config: '{"skipInTests": false, "allowDomAssertions": true}',
    enabled_by_default: true,
    group: typescript_group # Assign RuleGroup object
  }
]

rules_data.each do |rule_attrs|
  rule_group = rule_attrs.delete(:group) # Extract the group object
  rule_record = Rule.find_or_create_by!(name: rule_attrs[:name]) do |rule|
    rule.description = rule_attrs[:description]
    rule.severity = rule_attrs[:severity]
    rule.default_config = rule_attrs[:default_config]
    rule.enabled_by_default = rule_attrs[:enabled_by_default]
    puts "Created rule: #{rule.name}"
  end
  # Create the association if it doesn't exist
  RuleGroupMembership.find_or_create_by!(rule: rule_record, rule_group: rule_group) do |membership|
    puts "Associated rule '#{rule_record.name}' with group '#{rule_group.name}'"
  end
end

puts 'Rules seeded successfully!'
