class Violation < ActiveRecord::Base
  belongs_to :file_with_violations, class_name: "FileWithViolations"
  belongs_to :severity, optional: true

  validates :rule_name, presence: true
  validates :start_line, presence: true
  validates :end_line, presence: true

  # Helper method to generate location range string
  def location_range
    if start_line == end_line
      if start_col && end_col
        "Line #{start_line}, columns #{start_col}-#{end_col}"
      else
        "Line #{start_line}"
      end
    else
      if start_col && end_col
        "Lines #{start_line}-#{end_line}, columns #{start_col}-#{end_col}"
      else
        "Lines #{start_line}-#{end_line}"
      end
    end
  end
end