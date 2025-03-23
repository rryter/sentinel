Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :projects, only: [:index, :show, :create]
      
      resources :analysis_jobs, only: [:index, :show, :create] do
        member do
          get :fetch_results
          post :process_results
        end

        resources :pattern_matches, only: [:index]

      end
      
      resources :pattern_matches, only: [:index]
    end
  end
end
