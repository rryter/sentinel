package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Job statuses
const (
	StatusPending   = "pending"
	StatusRunning   = "running"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
)

// AnalysisJob represents a single analysis job
type AnalysisJob struct {
	ID            string    `json:"id"`
	Status        string    `json:"status"`
	StartTime     time.Time `json:"startTime"`
	CompletedTime time.Time `json:"completedTime,omitempty"`
	ResultPath    string    `json:"resultPath,omitempty"`
	Error         string    `json:"error,omitempty"`
}

// handleFileUpload handles file upload requests
func (s *Server) handleFileUpload(w http.ResponseWriter, r *http.Request) {
	// Check if the request method is POST
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse the multipart form with 32 MB max memory
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, `{"error": "Failed to parse form: %s"}`, err.Error())
		return
	}

	// Get the file from the form
	file, handler, err := r.FormFile("file")
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, `{"error": "Failed to get file: %s"}`, err.Error())
		return
	}
	defer file.Close()

	// Generate a safe filename to prevent path traversal
	safeFilename := filepath.Base(handler.Filename)
	tempFilePath := filepath.Join(s.uploadDir, safeFilename)

	// Create a temporary file
	tempFile, err := os.Create(tempFilePath)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to create temporary file: %s"}`, err.Error())
		return
	}
	defer tempFile.Close()

	// Copy the entire file to the temp file first
	_, err = io.Copy(tempFile, file)
	if err != nil {
		os.Remove(tempFilePath) // Clean up temp file on error
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to save uploaded file: %s"}`, err.Error())
		return
	}

	// Reopen the file for reading to identify category
	tempFile.Close()
	fileForReading, err := os.Open(tempFilePath)
	if err != nil {
		os.Remove(tempFilePath) // Clean up temp file on error
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to reopen file for processing: %s"}`, err.Error())
		return
	}
	defer fileForReading.Close()

	// Process the file content to identify the rule category
	category, err := identifyRuleCategory(fileForReading)
	if err != nil {
		os.Remove(tempFilePath) // Clean up temp file on error
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to identify rule category: %s"}`, err.Error())
		return
	}

	// Create category directory if it doesn't exist
	categoryDir := filepath.Join(s.rulesDir, category)
	if err := os.MkdirAll(categoryDir, os.ModePerm); err != nil {
		os.Remove(tempFilePath) // Clean up temp file on error
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to create category directory: %s"}`, err.Error())
		return
	}

	// Move the file to the appropriate category directory
	finalPath := filepath.Join(categoryDir, safeFilename)
	if err := os.Rename(tempFilePath, finalPath); err != nil {
		os.Remove(tempFilePath) // Clean up temp file on error
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to move file to category directory: %s"}`, err.Error())
		return
	}

	// Send success response as JSON for Angular to consume
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"success": true, "filename": "%s", "path": "%s", "category": "%s"}`,
		safeFilename, finalPath, category)
	log.Printf("File %s uploaded successfully to %s (category: %s)", safeFilename, finalPath, category)
}

// handleGetRules handles GET requests to retrieve all rules organized by category
func (s *Server) handleGetRules(w http.ResponseWriter, r *http.Request) {
	// Only allow GET requests
	if r.Method != http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintf(w, `{"error": "Method not allowed. Use GET."}`)
		return
	}

	// Get the current working directory
	cwd, err := os.Getwd()
	if err != nil {
		log.Printf("Error getting current working directory: %v", err)
	} else {
		log.Printf("Current working directory: %s", cwd)
	}

	// Convert rules directory to absolute path
	absRulesDir, err := filepath.Abs(s.rulesDir)
	if err != nil {
		log.Printf("Error getting absolute path for rules directory: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to resolve rules directory path"}`)
		return
	}
	log.Printf("Absolute rules directory: %s", absRulesDir)

	// Check if rules directory exists
	if _, err := os.Stat(absRulesDir); os.IsNotExist(err) {
		log.Printf("Rules directory does not exist: %s", absRulesDir)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Rules directory does not exist"}`)
		return
	}
	log.Printf("Rules directory exists: %s", absRulesDir)

	// Map to store rules by category
	rulesByCategory := make(map[string][]string)

	// Walk through the rules directory
	err = filepath.Walk(absRulesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			log.Printf("Error walking path %s: %v", path, err)
			return err
		}

		// Skip the root directory and directories
		if path == absRulesDir || info.IsDir() {
			log.Printf("Skipping directory: %s", path)
			return nil
		}

		log.Printf("Found file: %s", path)

		// Get relative path from rules directory
		relPath, err := filepath.Rel(absRulesDir, path)
		if err != nil {
			log.Printf("Error getting relative path for %s: %v", path, err)
			return err
		}
		// Split path to get category and filename
		parts := strings.SplitN(relPath, string(os.PathSeparator), 2)

		category := "uncategorized"
		filename := relPath

		if len(parts) == 2 {
			category = parts[0]
			filename = parts[1]
		}

		log.Printf("Category: %s, Filename: %s", category, filename)

		// Only consider files with .so extension
		if !strings.HasSuffix(filename, ".so") {
			log.Printf("Skipping non-.so file: %s", filename)
			return nil
		}

		// Add rule to the appropriate category
		rulesByCategory[category] = append(rulesByCategory[category], filename)
		log.Printf("Added rule to category %s: %s", category, filename)

		return nil
	})

	if err != nil {
		log.Printf("Error walking rules directory: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to read rules directory: %s"}`, err.Error())
		return
	}

	// Convert map to JSON and send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(rulesByCategory); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to encode response: %s"}`, err.Error())
		return
	}

	log.Printf("Rules retrieved successfully, found %d categories", len(rulesByCategory))
}

// handleStartAnalysis handles requests to start a new analysis job
func (s *Server) handleStartAnalysis(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintf(w, `{"error": "Method not allowed. Use POST."}`)
		return
	}

	// Generate a unique job ID
	jobID := uuid.New().String()

	// Create a new job
	job := &AnalysisJob{
		ID:        jobID,
		Status:    StatusPending,
		StartTime: time.Now(),
	}

	// Store the job
	s.jobsMutex.Lock()
	s.jobs[jobID] = job
	s.jobsMutex.Unlock()

	// Start the analysis in a goroutine
	go s.runAnalysis(jobID)

	// Return the job ID immediately
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{
		"jobId":  jobID,
		"status": StatusPending,
	})
}

// handleGetJobStatus handles requests to check the status of an analysis job
func (s *Server) handleGetJobStatus(w http.ResponseWriter, r *http.Request) {
	// Only allow GET requests
	if r.Method != http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintf(w, `{"error": "Method not allowed. Use GET."}`)
		return
	}

	// Extract job ID from URL path
	// Assuming path pattern: /api/analyze/status/{jobID}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, `{"error": "Invalid URL path. Expected /api/analyze/status/{jobID}"}`)
		return
	}
	jobID := parts[len(parts)-1]

	// Get the job
	s.jobsMutex.RLock()
	job, exists := s.jobs[jobID]
	s.jobsMutex.RUnlock()

	if !exists {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintf(w, `{"error": "Job not found"}`)
		return
	}

	// Return the job status
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(job)
}

// handleGetAnalysisResults handles requests to retrieve analysis results for a job
func (s *Server) handleGetAnalysisResults(w http.ResponseWriter, r *http.Request) {
	// Only allow GET requests
	if r.Method != http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintf(w, `{"error": "Method not allowed. Use GET."}`)
		return
	}

	// Extract job ID from URL path
	// Assuming path pattern: /api/analyze/results/{jobID}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, `{"error": "Invalid URL path. Expected /api/analyze/results/{jobID}"}`)
		return
	}
	jobID := parts[len(parts)-1]

	// Get the job
	s.jobsMutex.RLock()
	job, exists := s.jobs[jobID]
	s.jobsMutex.RUnlock()

	if !exists {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintf(w, `{"error": "Job not found"}`)
		return
	}

	// Check if job is completed and has a result path
	if job.Status != StatusCompleted || job.ResultPath == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		errMsg := "Results not available"
		if job.Status != StatusCompleted {
			errMsg = fmt.Sprintf("Job is not completed. Current status: %s", job.Status)
		}
		fmt.Fprintf(w, `{"error": "%s"}`, errMsg)
		return
	}

	// Read the patterns.json file
	data, err := os.ReadFile(job.ResultPath)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error": "Failed to read results file: %s"}`, err.Error())
		return
	}

	// Return the patterns.json content
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// runAnalysis runs the indexer bin and updates the job status
func (s *Server) runAnalysis(jobID string) {
	// Update job status to running
	s.jobsMutex.Lock()
	job := s.jobs[jobID]
	job.Status = StatusRunning
	s.jobsMutex.Unlock()

	// Create a directory for the results if it doesn't exist
	jobDir := filepath.Join(s.resultsDir, jobID)
	if err := os.MkdirAll(jobDir, os.ModePerm); err != nil {
		s.updateJobWithError(jobID, fmt.Sprintf("Failed to create results directory: %s", err.Error()))
		return
	}

	// Set up the output path for patterns.json
	resultPath := filepath.Join(jobDir, "patterns.json")

	log.Printf("indexerPath: %s", s.indexerPath)

	// Make sure the indexer is executable
	if err := os.Chmod(s.indexerPath, 0755); err != nil {
		log.Printf("Warning: Could not set executable permissions on indexer: %s", err.Error())
		// Continue anyway as it might already have the right permissions
	}

	// Prepare the command to run the indexer with correct arguments
	cmd := exec.Command(s.indexerPath,
		"-dir", "/home/rryter/projects/rai/apps/angular-ai-gen-backend/src/app",
		"-outdir", jobDir,
		"-rules", s.rulesDir,
		"-cache", filepath.Join(s.resultsDir, "ast-cache.json"))

	// Capture stdout and stderr
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Log the command being executed
	log.Printf("Running command: %s", cmd.String())

	// Run the command
	err := cmd.Run()
	if err != nil {
		errMsg := fmt.Sprintf("Analysis failed: %s\nStderr: %s", err.Error(), stderr.String())
		s.updateJobWithError(jobID, errMsg)
		return
	}

	// Log the output
	log.Printf("Command output: %s", stdout.String())

	// Update job status to completed
	s.jobsMutex.Lock()
	job = s.jobs[jobID]
	job.Status = StatusCompleted
	job.CompletedTime = time.Now()
	job.ResultPath = resultPath
	s.jobsMutex.Unlock()

	log.Printf("Analysis job %s completed successfully", jobID)
}

// updateJobWithError updates a job with error status
func (s *Server) updateJobWithError(jobID, errorMsg string) {
	s.jobsMutex.Lock()
	job := s.jobs[jobID]
	job.Status = StatusFailed
	job.Error = errorMsg
	job.CompletedTime = time.Now()
	s.jobsMutex.Unlock()
	log.Printf("Analysis job %s failed: %s", jobID, errorMsg)
}