package rules

import (
	"fmt"
	"io/fs"
	"path/filepath"
	"plugin"
	customlog "sentinel-refactored/pkg/log"
	"sentinel-refactored/pkg/rule_interface"
	"strings"
	// Consider adding a logger dependency here, e.g.:
	// "sentinel-refactored/pkg/log"
)

// RuleFactoryFunc defines the expected signature for the function exported by rule plugins.
// It should return a new instance of a type implementing the Rule interface.
type RuleFactoryFunc func() rule_interface.Rule

// RuleLoader is responsible for discovering and loading analysis rules from shared object (.so) files.
type RuleLoader struct {
	registry *RuleRegistry
}

// NewRuleLoader creates a new loader associated with the given registry.
func NewRuleLoader(registry *RuleRegistry) *RuleLoader {
	if registry == nil {
		// Optionally panic or return an error if registry is nil, depending on design.
		// For now, assume a valid registry is required.
		panic("loader: RuleRegistry cannot be nil")
	}
	return &RuleLoader{
		registry: registry,
	}
}

// LoadRulesFromDir scans the specified directory for .so files and attempts to load
// rules from them, registering valid rules with the associated registry.
func (l *RuleLoader) LoadRulesFromDir(rulesDir string) error {
	absRulesDir, err := filepath.Abs(rulesDir)
	if err != nil {
		return fmt.Errorf("loader: failed to get absolute path for rules directory '%s': %w", rulesDir, err)
	}

	customlog.Debugf("Scanning for rule plugins in: %s", absRulesDir)

	err = filepath.WalkDir(absRulesDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			customlog.Warnf("Error accessing path %s: %v", path, err)
			return nil // Continue walking if possible
		}

		// Skip directories and non-.so files
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".so") {
			return nil
		}

		customlog.Debugf("Attempting to load plugin: %s", path)
		plg, err := plugin.Open(path)
		if err != nil {
			customlog.Errorf("Failed to load plugin '%s': %v", path, err)
			return nil
		}

		// Look for the rule factory function.
		factoryFuncName := "CreateRule"
		ruleNameFromFile := strings.TrimSuffix(d.Name(), ".so")
		specificFactoryFuncName := "CreateRule" + toPascalCase(ruleNameFromFile)

		var symbol plugin.Symbol
		var foundFuncName string

		// Try specific name first
		symbol, err = plg.Lookup(specificFactoryFuncName)
		if err == nil {
			foundFuncName = specificFactoryFuncName
		} else {
			// Try generic name if specific one fails
			symbol, err = plg.Lookup(factoryFuncName)
			if err == nil {
				foundFuncName = factoryFuncName
			} else {
				customlog.Errorf("Failed to find symbol '%s' or '%s' in plugin '%s': %v", specificFactoryFuncName, factoryFuncName, path, err)
				return nil
			}
		}

		// Check if the symbol is of the expected type
		createRuleFunc, ok := symbol.(func() rule_interface.Rule)
		if !ok {
			customlog.Errorf("Symbol '%s' in plugin '%s' has incorrect type signature. Expected func() rule_interface.Rule, got %T", foundFuncName, path, symbol)
			return nil
		}

		// Create and register the rule
		rule := createRuleFunc()
		if err := l.registry.Register(rule); err != nil {
			customlog.Errorf("Failed to register rule '%s' from plugin '%s': %v", rule.ID(), path, err)
			return nil // Continue loading other rules
		}

		customlog.Infof("Successfully loaded and registered rule '%s' (%s) from plugin '%s'", rule.Name(), rule.ID(), path)
		return nil
	})

	if err != nil {
		return fmt.Errorf("loader: failed to walk rules directory '%s': %w", absRulesDir, err)
	}

	customlog.Infof("Finished loading rules. Total registered: %d", l.registry.Count())
	return nil
}

// toPascalCase converts a snake_case or kebab-case string to PascalCase.
// This is a simplified version; a more robust implementation might be needed.
func toPascalCase(s string) string {
	parts := strings.FieldsFunc(s, func(r rune) bool {
		return r == '_' || r == '-'
	})
	for i, part := range parts {
		if len(part) > 0 {
			parts[i] = strings.ToUpper(string(part[0])) + strings.ToLower(part[1:])
		}
	}
	return strings.Join(parts, "")
} 