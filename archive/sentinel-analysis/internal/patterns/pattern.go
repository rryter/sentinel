package patterns

import (
	"fmt"
)

// Match represents a pattern match result
type Match struct {
	RuleID      string                 `json:"ruleId"`
	RuleName    string                 `json:"ruleName"`
	Description string                 `json:"description"`
	FilePath    string                 `json:"filePath"`
	Location    Location               `json:"location"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// Location represents a position in the source code
type Location struct {
	Start  int `json:"start"`
	End    int `json:"end"`
	Line   int `json:"line"`
	Column int `json:"column"`
}

// Rule defines the interface for pattern matching rules
type Rule interface {
	// ID returns the unique identifier of the rule
	ID() string

	// Name returns the human-readable name of the rule
	Name() string

	// Description returns a description of what the rule checks for
	Description() string

	// Match checks if the given AST node matches the rule's pattern
	Match(node map[string]interface{}, filePath string) []Match
}

// BaseRule provides common functionality for rules
type BaseRule struct {
	id          string
	name        string
	description string
}

// NewBaseRule creates a new base rule
func NewBaseRule(id, name, description string) BaseRule {
	return BaseRule{
		id:          id,
		name:        name,
		description: description,
	}
}

// ID returns the rule's ID
func (r BaseRule) ID() string {
	return r.id
}

// Name returns the rule's name
func (r BaseRule) Name() string {
	return r.name
}

// Description returns the rule's description
func (r BaseRule) Description() string {
	return r.description
}

// Registry manages the collection of pattern matching rules
type Registry struct {
	rules map[string]Rule
}

// NewRegistry creates a new rule registry
func NewRegistry() *Registry {
	return &Registry{
		rules: make(map[string]Rule),
	}
}

// RegisterRule adds a rule to the registry
func (r *Registry) RegisterRule(rule Rule) error {
	if _, exists := r.rules[rule.ID()]; exists {
		return fmt.Errorf("rule with ID %s already exists", rule.ID())
	}
	r.rules[rule.ID()] = rule
	return nil
}

// GetRule retrieves a rule by its ID
func (r *Registry) GetRule(id string) (Rule, bool) {
	rule, exists := r.rules[id]
	return rule, exists
}

// GetAllRules returns all registered rules
func (r *Registry) GetAllRules() []Rule {
	rules := make([]Rule, 0, len(r.rules))
	for _, rule := range r.rules {
		rules = append(rules, rule)
	}
	return rules
}

// Helper functions for pattern matching
func GetNodeType(node map[string]interface{}) string {
	if typeStr, ok := node["type"].(string); ok {
		return typeStr
	}
	return ""
}

func GetNodeName(node map[string]interface{}) string {
	if id, ok := node["id"].(map[string]interface{}); ok {
		if name, ok := id["name"].(string); ok {
			return name
		}
	}
	return ""
}

func GetLocation(node map[string]interface{}) Location {
	loc := Location{}
	if start, ok := node["start"].(float64); ok {
		loc.Start = int(start)
	}
	if end, ok := node["end"].(float64); ok {
		loc.End = int(end)
	}
	if line, ok := node["line"].(float64); ok {
		loc.Line = int(line)
	}
	if col, ok := node["column"].(float64); ok {
		loc.Column = int(col)
	}
	return loc
}

// TraverseAST traverses an AST and applies the given visitor function to each node
func TraverseAST(node map[string]interface{}, visitor func(map[string]interface{}) bool) {
	if node == nil {
		return
	}

	// Visit the current node
	if !visitor(node) {
		return
	}

	// Traverse child nodes
	for _, key := range []string{"body", "declaration", "declarations", "expression"} {
		if child, ok := node[key]; ok {
			switch v := child.(type) {
			case map[string]interface{}:
				TraverseAST(v, visitor)
			case []interface{}:
				for _, item := range v {
					if itemMap, ok := item.(map[string]interface{}); ok {
						TraverseAST(itemMap, visitor)
					}
				}
			}
		}
	}
}
