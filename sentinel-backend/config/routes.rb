Rails.application.routes.draw do
  devise_for :users

  mount Rswag::Ui::Engine => '/api-docs'
  mount Rswag::Api::Engine => '/api-docs'
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :projects, only: [:index, :show, :create] do
        resources :analysis_submissions, only: [:create], path: 'analysis_submissions'
      end
      
      resources :analysis_jobs, only: [:index, :show, :create] do
        member do
          post :process_results
          get 'files/:file_path/violations', to: 'analysis_jobs#file_violations', constraints: { file_path: /.*/ }
        end

        resources :violations, only: [:index] do
          collection do
            get :time_series
          end
        end
      end
      
      resources :violations, only: [:index] do
        collection do
          get :time_series
        end
      end

      get 'files_with_violations', to: 'files_with_violations#index'

      # GitHub integration routes
      post 'auth/github/callback', to: 'github#callback'
      get 'github/repositories', to: 'github#repositories'

      # Webauthn
      post 'auth/webauthn/setup', to: 'user_registration#create'
      post 'auth/webauthn/register', to: 'user_registration#register'
      post 'auth/webauthn/login/options', to: 'authentication#webauthn_options'
      post 'auth/webauthn/login/authenticate', to: 'authentication#webauthn_authenticate'
          
      resources :examples

      resources :build_metrics, only: [:index, :create]
      resources :violations_metrics, only: [:index]
    end
  end
end
