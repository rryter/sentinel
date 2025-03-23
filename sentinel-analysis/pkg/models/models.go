package models

import (
	"time"
)

// SourceFile represents a file to be analyzed
type SourceFile struct {
	Path         string      `json:"path"`
	RelativePath string      `json:"relativePath"`
	Size         int64       `json:"size"`
	ModTime      time.Time   `json:"modTime"`
	FileType     string      `json:"fileType"`
	AST          interface{} `json:"ast,omitempty"`
}

// ASTRoot represents the root of the AST
type ASTRoot struct {
	Kind     string    `json:"kind"`
	Text     string    `json:"text,omitempty"`
	Start    int       `json:"start"`
	End      int       `json:"end"`
	Children []ASTNode `json:"children"`
}

// ASTNode represents a node in the AST
type ASTNode struct {
	Kind     string    `json:"kind"`
	Text     string    `json:"text,omitempty"`
	Start    int       `json:"start"`
	End      int       `json:"end"`
	Children []ASTNode `json:"children,omitempty"`
}

// TypeAssertion represents a type assertion in TypeScript
type TypeAssertion struct {
	Line           int    `json:"line"`
	Column         int    `json:"column"`
	Text           string `json:"text"`
	ExpressionType string `json:"expressionType"`
	AssertedType   string `json:"assertedType"`
}

// CodeLocation represents a location in the code
type CodeLocation struct {
	FilePath  string `json:"filePath"`
	StartLine int    `json:"startLine"`
	EndLine   int    `json:"endLine"`
	StartCol  int    `json:"startCol,omitempty"`
	EndCol    int    `json:"endCol,omitempty"`
}

// CodeChunk represents a chunk of code to be processed
type CodeChunk struct {
	ID         string            `json:"id"`
	FilePath   string            `json:"filePath"`
	Content    string            `json:"content"`
	StartLine  int               `json:"startLine"`
	EndLine    int               `json:"endLine"`
	Imports    []string          `json:"imports,omitempty"`
	Context    string            `json:"context,omitempty"`
	References map[string]string `json:"references,omitempty"`
	TokenCount int               `json:"tokenCount,omitempty"`
}

// PatternResult represents a pattern match result
type PatternResult struct {
	RuleID      string                 `json:"ruleId"`
	RuleName    string                 `json:"ruleName"`
	Description string                 `json:"description"`
	FilePath    string                 `json:"filePath"`
	Location    CodeLocation           `json:"location"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// AnalysisResult represents the result of analyzing a file
type AnalysisResult struct {
	FilePath       string          `json:"filePath"`
	AST            *ASTRoot        `json:"ast,omitempty"`
	PatternMatches []PatternResult `json:"patternMatches,omitempty"`
	TypeAssertions []TypeAssertion `json:"typeAssertions,omitempty"`
	Chunks         []CodeChunk     `json:"chunks,omitempty"`
}

// IndexingResult represents the complete result of the indexing process
type IndexingResult struct {
	ProjectName    string           `json:"projectName"`
	TotalFiles     int              `json:"totalFiles"`
	ProcessedFiles int              `json:"processedFiles"`
	FileResults    []AnalysisResult `json:"fileResults"`
	Timestamp      time.Time        `json:"timestamp"`
}
