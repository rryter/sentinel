package rules

import (
	"fmt"
	"sentinel-refactored/pkg/rule_interface"
	"sync"
)

// RuleRegistry manages and provides access to the collection of available analysis rules.
type RuleRegistry struct {
	mu    sync.RWMutex
	rules map[string]rule_interface.Rule // Rules indexed by their unique IDs
}

// NewRuleRegistry creates a new empty registry.
func NewRuleRegistry() *RuleRegistry {
	return &RuleRegistry{
		rules: make(map[string]rule_interface.Rule),
	}
}

// Register adds a rule to the registry.
// Returns an error if a rule with the same ID is already registered.
func (r *RuleRegistry) Register(rule rule_interface.Rule) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	id := rule.ID()
	if _, exists := r.rules[id]; exists {
		return fmt.Errorf("registry: rule with ID '%s' is already registered", id)
	}

	r.rules[id] = rule
	return nil
}

// GetRule retrieves a rule by its ID.
// Returns nil if no rule with the given ID exists.
func (r *RuleRegistry) GetRule(id string) rule_interface.Rule {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.rules[id]
}

// GetAllRules returns all registered rules.
func (r *RuleRegistry) GetAllRules() []rule_interface.Rule {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rules := make([]rule_interface.Rule, 0, len(r.rules))
	for _, rule := range r.rules {
		rules = append(rules, rule)
	}
	return rules
}

// Count returns the number of registered rules.
func (r *RuleRegistry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return len(r.rules)
} 