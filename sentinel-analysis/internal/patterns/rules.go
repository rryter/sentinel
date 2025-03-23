package patterns

// CategoryRule extends the Rule interface to include category information
type CategoryRule interface {
	Rule

	// Category returns the category of the rule
	Category() string

	// SetCategory sets the category of the rule
	SetCategory(category string)
}

// RuleWithCategory implements the CategoryRule interface
type RuleWithCategory struct {
	BaseRule
	category string
}

// NewRuleWithCategory creates a new rule with category support
func NewRuleWithCategory(id, name, description, category string) RuleWithCategory {
	return RuleWithCategory{
		BaseRule: NewBaseRule(id, name, description),
		category: category,
	}
}

// Category returns the rule's category
func (r RuleWithCategory) Category() string {
	return r.category
}

// SetCategory sets the rule's category
func (r *RuleWithCategory) SetCategory(category string) {
	r.category = category
}

// TrySetCategory attempts to set the category on a rule if it supports it
func TrySetCategory(rule Rule, category string) {
	if categorySetter, ok := rule.(interface{ SetCategory(string) }); ok {
		categorySetter.SetCategory(category)
	}
}

// GetCategory attempts to get the category from a rule if it supports it
func GetCategory(rule Rule) string {
	if categorized, ok := rule.(interface{ Category() string }); ok {
		return categorized.Category()
	}
	return "default"
}
