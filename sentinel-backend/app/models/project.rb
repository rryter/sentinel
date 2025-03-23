class Project < ActiveRecord::Base
  has_many :analysis_jobs, dependent: :destroy
  
  validates :name, presence: true
end 