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