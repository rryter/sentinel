class PatternMatch < ActiveRecord::Base
  belongs_to :analysis_file
  
  validates :rule_name, presence: true
  validates :start_line, presence: true
  validates :end_line, presence: true
  
  def location_range
    "#{start_line}:#{start_col}-#{end_line}:#{end_col}"
  end
end 