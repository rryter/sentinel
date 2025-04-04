package log

import (
	"fmt"
	"io"
	"log"
	"os"
	"strings"
)

// LogLevel defines the level of logging.
type LogLevel int

const (
	LevelDebug LogLevel = iota
	LevelInfo
	LevelWarn
	LevelError
	LevelFatal
	LevelNone // To disable logging
)

var currentLevel = LevelInfo // Default log level
var logger = log.New(os.Stderr, "", log.Ldate|log.Ltime|log.Lshortfile) // Default logger

// SetLevel sets the global logging level.
func SetLevel(level LogLevel) {
	currentLevel = level
}

// SetOutput sets the output destination for the logger.
func SetOutput(w io.Writer) {
	logger.SetOutput(w)
}

// LevelFromString converts a string (case-insensitive) to a LogLevel.
func LevelFromString(levelStr string) LogLevel {
	switch strings.ToUpper(levelStr) {
	case "DEBUG":
		return LevelDebug
	case "INFO":
		return LevelInfo
	case "WARN", "WARNING":
		return LevelWarn
	case "ERROR":
		return LevelError
	case "FATAL":
		return LevelFatal
	case "NONE":
		return LevelNone
	default:
		Warnf("Unknown log level string: '%s'. Defaulting to INFO.", levelStr)
		return LevelInfo
	}
}

// logf handles the actual logging if the level is sufficient.
func logf(level LogLevel, prefix string, format string, args ...interface{}) {
	if currentLevel <= level {
		// Call Output directly to control call depth for correct file/line reporting
		logger.Output(3, fmt.Sprintf(prefix+format, args...))
	}
}

// Debugf logs a debug message.
func Debugf(format string, args ...interface{}) {
	logf(LevelDebug, "[DEBUG] ", format, args...)
}

// Infof logs an info message.
func Infof(format string, args ...interface{}) {
	logf(LevelInfo, "[INFO]  ", format, args...)
}

// Warnf logs a warning message.
func Warnf(format string, args ...interface{}) {
	logf(LevelWarn, "[WARN]  ", format, args...)
}

// Errorf logs an error message.
func Errorf(format string, args ...interface{}) {
	logf(LevelError, "[ERROR] ", format, args...)
}

// Fatalf logs an error message and exits.
func Fatalf(format string, args ...interface{}) {
	logf(LevelFatal, "[FATAL] ", format, args...)
	os.Exit(1)
} 