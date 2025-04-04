package rule_interface

// Location represents a position within a source file.
type Location struct {
	Line   int `json:"line"`   // 1-based line number
	Column int `json:"column"` // 1-based column number
	Start  int `json:"start"`  // 0-based byte offset start
	End    int `json:"end"`    // 0-based byte offset end
}

// Match represents a rule violation or issue found during analysis.
type Match struct {
	// RuleID is the ID of the rule that was triggered
	RuleID string

	// FilePath is the path to the file where the violation was found
	FilePath string

	// Message is a description of the issue
	Message string

	// Line is the line number where the violation occurred
	Line int

	// Column is the column number where the violation started
	Column int

	// Severity indicates how serious the violation is
	Severity MatchSeverity
}

// MatchSeverity indicates the importance or criticality of a rule violation
type MatchSeverity int

// Severity levels
const (
	// SeverityError indicates a critical issue that should be fixed
	SeverityError MatchSeverity = iota

	// SeverityWarning indicates a potential issue that should be reviewed
	SeverityWarning

	// SeverityInfo indicates informational feedback that is not necessarily problematic
	SeverityInfo
) 