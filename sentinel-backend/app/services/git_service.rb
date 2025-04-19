require 'fileutils'
require 'open3'

class GitService
  class GitError < StandardError; end

  def initialize(project)
    @project = project
    @repo_path = File.join(Rails.root, 'repositories', project.id.to_s)
  end

  def clone_repository
    # Create repositories directory if it doesn't exist
    FileUtils.mkdir_p(File.join(Rails.root, 'repositories'))
    
    # Remove existing repository if it exists
    FileUtils.rm_rf(@repo_path) if Dir.exist?(@repo_path)

    # Extract token from repository URL if it exists
    url_with_token = if @project.repository_url.start_with?('https://github.com')
      uri = URI(@project.repository_url)
      token = extract_token_from_headers
      "https://#{token}@#{uri.host}#{uri.path}"
    else
      @project.repository_url
    end

    # Clone the repository
    output, status = Open3.capture2e("git clone #{url_with_token} #{@repo_path}")
    
    unless status.success?
      error_message = sanitize_error_message(output)
      raise GitError, "Failed to clone repository: #{error_message}"
    end

    { path: @repo_path }
  end

  private

  def extract_token_from_headers
    token = Thread.current[:github_token]
    raise GitError, 'GitHub token not found' unless token
    token
  end

  def sanitize_error_message(message)
    # Remove any sensitive information from error messages
    message.gsub(/https:\/\/[^@]+@/, 'https://')
  end
end 