class Project < ActiveRecord::Base
  has_many :analysis_jobs, dependent: :destroy
  
  validates :name, presence: true, uniqueness: true
  validates :repository_url, presence: true
  
  # Configure kaminari
  paginates_per 10
end 