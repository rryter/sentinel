package analyzer

// Assertion represents a type assertion found in the code
type Assertion struct {
	Type     string
	Value    string
	Location Location
	Context  string
}

// Location represents the position of an assertion in the source code
type Location struct {
	File     string
	Line     int
	Column   int
	StartPos int
	EndPos   int
}

// NewAssertion creates a new Assertion instance
func NewAssertion(assertionType, value string, location Location, context string) Assertion {
	return Assertion{
		Type:     assertionType,
		Value:    value,
		Location: location,
		Context:  context,
	}
}
