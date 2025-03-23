package main

import (
	"net/http"
	"sync"
)

// Server represents the HTTP server configuration
type Server struct {
	uploadDir   string
	rulesDir    string
	resultsDir  string
	indexerPath string
	router      *http.ServeMux
	jobs        map[string]*AnalysisJob
	jobsMutex   sync.RWMutex
}

// NewServer creates and configures a new Server instance
func NewServer(uploadDir, rulesDir, resultsDir, indexerPath string) *Server {
	s := &Server{
		uploadDir:   uploadDir,
		rulesDir:    rulesDir,
		resultsDir:  resultsDir,
		indexerPath: indexerPath,
		router:      http.NewServeMux(),
		jobs:        make(map[string]*AnalysisJob),
	}

	// Set up routes
	s.setupRoutes()

	return s
}

// setupRoutes configures all the routes for the server
func (s *Server) setupRoutes() {
	// Apply CORS middleware to all endpoints
	s.router.Handle("/api/upload", s.corsMiddleware(http.HandlerFunc(s.handleFileUpload)))
	s.router.Handle("/api/rules", s.corsMiddleware(http.HandlerFunc(s.handleGetRules)))
	s.router.Handle("/api/analyze", s.corsMiddleware(http.HandlerFunc(s.handleStartAnalysis)))
	s.router.Handle("/api/analyze/status/", s.corsMiddleware(http.HandlerFunc(s.handleGetJobStatus)))
	s.router.Handle("/api/analyze/results/", s.corsMiddleware(http.HandlerFunc(s.handleGetAnalysisResults)))
}

// corsMiddleware handles CORS for Angular frontend
func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from Angular app
		w.Header().Set("Access-Control-Allow-Origin", "*") // Replace with your Angular app's origin in production
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
