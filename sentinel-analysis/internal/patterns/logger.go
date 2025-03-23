package patterns

import (
	"fmt"
	"os"
	"strings"
)

// LogLevel represents the logging level
type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
)

var (
	currentLogLevel = INFO // Default to INFO
)

// SetDebug enables or disables debug logging
func SetDebug(enabled bool) {
	if enabled {
		currentLogLevel = DEBUG
	} else {
		currentLogLevel = INFO
	}
}

// SetLogLevel sets the global log level
func SetLogLevel(level LogLevel) {
	currentLogLevel = level
}

// GetLogLevelFromEnv gets the log level from SENTINEL_LOG_LEVEL environment variable
func GetLogLevelFromEnv() LogLevel {
	level := strings.ToUpper(os.Getenv("SENTINEL_LOG_LEVEL"))
	switch level {
	case "DEBUG":
		return DEBUG
	case "INFO":
		return INFO
	case "WARN":
		return WARN
	case "ERROR":
		return ERROR
	default:
		return INFO
	}
}

// Debug logs a debug message if debug logging is enabled
func Debug(format string, args ...interface{}) {
	if currentLogLevel <= DEBUG {
		fmt.Printf("[DEBUG] "+format+"\n", args...)
	}
}

// Info logs an info message
func Info(format string, args ...interface{}) {
	if currentLogLevel <= INFO {
		fmt.Printf("[INFO] "+format+"\n", args...)
	}
}

// Warn logs a warning message
func Warn(format string, args ...interface{}) {
	if currentLogLevel <= WARN {
		fmt.Printf("[WARN] "+format+"\n", args...)
	}
}

// Error logs an error message
func Error(format string, args ...interface{}) {
	if currentLogLevel <= ERROR {
		fmt.Printf("[ERROR] "+format+"\n", args...)
	}
}
