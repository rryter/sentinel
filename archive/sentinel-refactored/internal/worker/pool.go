package worker

import (
	"fmt"
	customlog "sentinel-refactored/pkg/log"
	"sync"
	"sync/atomic"
)

// Task represents a unit of work to be performed by a worker.
// It includes the data needed for the task and a function to execute.
type Task struct {
	ID   string      // Optional identifier for the task
	Data interface{} // Data to be processed by the task
	Func func(data interface{}) (interface{}, error) // Function to execute
}

// Result holds the outcome of a completed task.
type Result struct {
	TaskID   string      // Identifier of the task that produced this result
	Value    interface{} // Result value (if successful)
	Error    error       // Error encountered (if any)
}

// Pool manages a pool of workers to execute tasks concurrently.
type Pool struct {
	numWorkers     int
	taskQueue      chan Task
	resultQueue    chan Result    // Internal channel for workers to send results to
	results        chan Result    // External channel for consumers to read results from
	wg             sync.WaitGroup
	stopOnce       sync.Once     // Ensures stop actions happen only once
	stopped        chan struct{} // Signals that the pool has stopped
	running        bool          // Track if the pool is actively running
	mu             sync.Mutex    // Mutex to protect state changes
	isShuttingDown atomic.Bool   // Flag to indicate shutdown is in progress
	started        sync.Once     // Ensure Run() is called only once
}

// NewPool creates a new worker pool with the specified number of workers.
// The buffer size for tasks is set to twice the number of workers
// by default, but can be increased using SetBufferSize.
func NewPool(numWorkers int) *Pool {
	if numWorkers <= 0 {
		numWorkers = 1 // Ensure at least one worker
	}
	
	// Create large buffers to avoid blocking
	bufferSize := numWorkers * 10
	if bufferSize < 100 {
		bufferSize = 100
	}
	
	pool := &Pool{
		numWorkers:  numWorkers,
		taskQueue:   make(chan Task, bufferSize), // Buffered task queue
		resultQueue: make(chan Result, bufferSize), // Internal results buffer
		results:     make(chan Result, bufferSize), // External results channel
		stopped:     make(chan struct{}),
		running:     false,
	}
	
	pool.isShuttingDown.Store(false)
	
	return pool
}

// SetBufferSize allows adjusting the buffer size for the task and result queues
// Call this before Run() for best results.
func (p *Pool) SetBufferSize(bufSize int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	
	if p.running {
		customlog.Warnf("Cannot change buffer size while pool is running")
		return
	}
	
	// Replace channels with new buffered channels
	p.taskQueue = make(chan Task, bufSize)
	p.resultQueue = make(chan Result, bufSize)
	p.results = make(chan Result, bufSize)
}

// Run starts the worker pool, spawning the specified number of workers
func (p *Pool) Run() {
	customlog.Debugf("Starting worker pool with %d workers...", p.numWorkers)
	p.started.Do(func() {
		p.mu.Lock()
		p.running = true
		p.mu.Unlock()
		
		// Start a separate goroutine to forward results from internal to external channel
		go func() {
			defer close(p.results) // Close external results when forwarding is done
			
			var collectedResults []Result
			for result := range p.resultQueue {
				collectedResults = append(collectedResults, result)
				p.results <- result
			}
			
			customlog.Debugf("Processed %d results from workers", len(collectedResults))
		}()

		// Start worker goroutines
		for i := 0; i < p.numWorkers; i++ {
			p.startWorker(i + 1)
		}
	})
}

// Start starts a worker with the given ID to process tasks from the queue
func (p *Pool) startWorker(workerID int) {
	p.wg.Add(1)
	go func() {
		defer p.wg.Done()
		customlog.Debugf("Worker %d started", workerID)

		// Process tasks until the queue is closed
		for task := range p.taskQueue {
			// Skip processing if the pool is shutting down
			// This helps avoid wasting resources on work that won't be used
			if p.isShuttingDown.Load() {
				customlog.Debugf("Worker %d skipping task as pool is shutting down", workerID)
				continue
			}

			// Process the task and send results
			customlog.Debugf("Worker %d processing task ID: %s", workerID, task.ID)
			value, err := task.Func(task.Data)
			
			// Skip sending results if the pool is shutting down
			if p.isShuttingDown.Load() {
				customlog.Debugf("Worker %d skipping result as pool is shutting down", workerID)
				continue
			}

			// Send result to the internal queue
			select {
			case p.resultQueue <- Result{TaskID: task.ID, Value: value, Error: err}:
				customlog.Debugf("Worker %d finished task ID: %s (Error: %v)", workerID, task.ID, err != nil)
			default:
				// Queue full or closed, log and continue
				customlog.Debugf("Worker %d unable to send result, queue might be full or closed", workerID)
			}
		}

		customlog.Debugf("Worker %d shutting down (task queue closed)", workerID)
	}()
}

// Submit adds a task to the worker pool's queue.
// Returns an error if the pool has been stopped.
func (p *Pool) Submit(taskFunc func(data interface{}) (interface{}, error), data interface{}) error {
	p.mu.Lock()
	running := p.running
	p.mu.Unlock()
	
	if !running {
		return fmt.Errorf("worker pool not running, cannot submit tasks")
	}
	
	if p.isShuttingDown.Load() {
		return fmt.Errorf("worker pool is shutting down, cannot submit new tasks")
	}
	
	// Create a task with a generated ID
	task := Task{
		ID:   fmt.Sprintf("task-%p", taskFunc), // Generate an ID based on function pointer
		Data: data,
		Func: taskFunc,
	}
	
	select {
	case <-p.stopped:
		return fmt.Errorf("worker pool stopped, cannot submit new tasks")
	case p.taskQueue <- task:
		return nil
	}
}

// SubmitTask adds a pre-constructed task to the worker pool's queue.
// Returns an error if the pool has been stopped.
func (p *Pool) SubmitTask(task Task) error {
	p.mu.Lock()
	running := p.running
	p.mu.Unlock()
	
	if !running {
		return fmt.Errorf("worker pool not running, cannot submit tasks")
	}
	
	if p.isShuttingDown.Load() {
		return fmt.Errorf("worker pool is shutting down, cannot submit new tasks")
	}
	
	select {
	case <-p.stopped:
		return fmt.Errorf("worker pool stopped, cannot submit new tasks")
	case p.taskQueue <- task:
		return nil
	}
}

// Results returns the channel from which task results can be read.
// The channel will be closed once all workers have finished.
func (p *Pool) Results() <-chan Result {
	return p.results
}

// Stop signals the pool to stop accepting new tasks and shuts down workers
// after the current queue is processed.
// This method is synchronous and only returns when all workers have finished.
func (p *Pool) Stop() {
	customlog.Debugf("Stop called on worker pool")
	
	p.mu.Lock()
	p.running = false
	p.mu.Unlock()
	
	p.stopOnce.Do(func() {
		// First close the task queue - this only prevents new tasks from being added
		// but allows existing tasks in the queue to be processed
		customlog.Debugf("Closing task queue to stop workers")
		close(p.taskQueue) // Close task queue to signal workers to stop
		
		// Now wait for all workers to complete their tasks
		customlog.Debugf("Waiting for all workers to complete...")
		p.wg.Wait() // Wait for all workers to finish
		
		// After all workers are done, set the shutdown flag to prevent new results
		p.isShuttingDown.Store(true)
		
		customlog.Debugf("All workers completed, closing internal result queue")
		close(p.resultQueue) // Now safe to close the internal result queue
		
		// Do NOT drain the results channel here! That's for the consumer to read.
		customlog.Debugf("Worker pool stopped, consumer can now read all results")
		
		// Signal that the pool has stopped
		close(p.stopped)
		
		customlog.Debugf("Worker pool stopped completely")
	})
} 