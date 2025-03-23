package patterns

import (
	"fmt"

	"github.com/fatih/color"
)

var (
	// Predefined color styles
	HeaderStyle  = color.New(color.FgBlue, color.Bold)
	SuccessStyle = color.New(color.FgGreen, color.Bold)
	ErrorStyle   = color.New(color.FgRed, color.Bold)
	WarningStyle = color.New(color.FgYellow, color.Bold)
	InfoStyle    = color.New(color.FgCyan)

	// Predefined symbols
	CheckMark = "✓"
	CrossMark = "✗"
	Arrow     = "➜"
	Bolt      = "⚡"
	Sparkles  = "✨"
	Warning   = "⚠️"
)

// PrintHeader prints a formatted header
func PrintHeader(format string, a ...interface{}) {
	HeaderStyle.Printf("\n"+format+"\n\n", a...)
}

// PrintSuccess prints a success message
func PrintSuccess(format string, a ...interface{}) {
	SuccessStyle.Printf(format+"\n", a...)
}

// PrintError prints an error message
func PrintError(format string, a ...interface{}) {
	ErrorStyle.Printf(format+"\n", a...)
}

// PrintWarning prints a warning message
func PrintWarning(format string, a ...interface{}) {
	WarningStyle.Printf(format+"\n", a...)
}

// PrintInfo prints an info message
func PrintInfo(format string, a ...interface{}) {
	InfoStyle.Printf(format+"\n", a...)
}

// PrintStep prints a step in the process
func PrintStep(step string) {
	fmt.Printf("%s %s\n", WarningStyle.Sprint(Arrow), HeaderStyle.Sprint(step))
}

// PrintBuildStatus prints the build status of a rule
func PrintBuildStatus(name string) func(success bool, err string) {
	InfoStyle.Printf("  %s Building %s...", Bolt, name)
	return func(success bool, err string) {
		if success {
			SuccessStyle.Printf(" %s\n", CheckMark)
		} else {
			ErrorStyle.Printf(" %s\n", CrossMark)
			if err != "" {
				ErrorStyle.Printf("    Error: %s\n", err)
			}
		}
	}
}
