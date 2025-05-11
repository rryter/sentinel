class Project < ActiveRecord::Base
  has_many :analysis_jobs, dependent: :destroy
  has_many :project_rules, dependent: :destroy
  has_many :rules, through: :project_rules

  validates :name, presence: true
  validates :repository_url, presence: true
end