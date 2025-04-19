Rails.application.routes.draw do
  mount Rswag::Ui::Engine => '/api-docs'
  mount Rswag::Api::Engine => '/api-docs'
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :projects, only: [:index, :show, :create]
      
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

      resources :examples
    end
  end
end
