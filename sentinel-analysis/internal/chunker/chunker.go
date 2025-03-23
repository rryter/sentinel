package chunker

import (
	"bufio"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io/ioutil"
	"regexp"
	"strings"

	"sentinel/indexing/pkg/models"
)

// Chunker handles code chunking for LLM processing
type Chunker struct {
	MaxChunkSize int
}

// NewChunker creates a new chunker
func NewChunker(maxChunkSize int) *Chunker {
	return &Chunker{
		MaxChunkSize: maxChunkSize,
	}
}

// ChunkFile chunks a file based on logical boundaries
func (c *Chunker) ChunkFile(filePath string, ast *models.ASTRoot) ([]models.CodeChunk, error) {
	// Read the file content
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("error reading file: %v", err)
	}

	// Split file into logical chunks
	chunks, err := c.createChunks(string(content), filePath, ast)
	if err != nil {
		return nil, err
	}

	return chunks, nil
}

// createChunks creates code chunks from file content
func (c *Chunker) createChunks(content string, filePath string, ast *models.ASTRoot) ([]models.CodeChunk, error) {
	// Identify imports in the file
	imports := c.extractImports(content)

	// Find logical boundaries (classes, functions, etc.)
	boundaries := c.findBoundaries(content, ast)

	// Create chunks based on boundaries
	chunks := c.createChunksFromBoundaries(content, filePath, boundaries, imports)

	// Further split chunks that exceed size limit
	chunks = c.refineChunks(chunks)

	return chunks, nil
}

// extractImports extracts import statements from the code
func (c *Chunker) extractImports(content string) []string {
	var imports []string

	// Use regex to find import statements
	importRegex := regexp.MustCompile(`import\s+.*?from\s+['"].*?['"];?`)
	matches := importRegex.FindAllString(content, -1)

	// Add each import statement
	for _, match := range matches {
		match = strings.TrimSpace(match)
		if !strings.HasSuffix(match, ";") {
			match += ";"
		}
		imports = append(imports, match)
	}

	return imports
}

// findBoundaries finds logical code boundaries
func (c *Chunker) findBoundaries(content string, ast *models.ASTRoot) []int {
	var boundaries []int

	// Start with line breaks as basic boundaries
	lines := strings.Split(content, "\n")

	lineStart := 0
	for _, line := range lines {
		lineEnd := lineStart + len(line)

		// Check if this line contains a significant boundary
		if c.isSignificantBoundary(line) {
			boundaries = append(boundaries, lineStart)
		}

		lineStart = lineEnd + 1 // +1 for the newline character
	}

	// Ensure there's a boundary at the start and end
	if len(boundaries) == 0 || boundaries[0] != 0 {
		boundaries = append([]int{0}, boundaries...)
	}

	if boundaries[len(boundaries)-1] != len(content) {
		boundaries = append(boundaries, len(content))
	}

	return boundaries
}

// isSignificantBoundary checks if a line is a significant boundary
func (c *Chunker) isSignificantBoundary(line string) bool {
	// Match patterns that indicate logical boundaries
	patterns := []string{
		`^export\s+(class|interface|function|type|enum)\s+`,
		`^(class|interface|function|type|enum)\s+`,
		`^@Component`,
		`^@Injectable`,
		`^@NgModule`,
		`^@Directive`,
		`^@Pipe`,
	}

	for _, pattern := range patterns {
		matched, _ := regexp.MatchString(pattern, strings.TrimSpace(line))
		if matched {
			return true
		}
	}

	return false
}

// createChunksFromBoundaries creates chunks based on boundaries
func (c *Chunker) createChunksFromBoundaries(content string, filePath string, boundaries []int, imports []string) []models.CodeChunk {
	var chunks []models.CodeChunk

	importText := strings.Join(imports, "\n")

	for i := 0; i < len(boundaries)-1; i++ {
		start := boundaries[i]
		end := boundaries[i+1]

		// Skip empty chunks
		if start == end {
			continue
		}

		// Extract the chunk content
		chunkContent := content[start:end]

		// Calculate start and end lines
		startLine := c.countLines(content[:start]) + 1
		endLine := startLine + c.countLines(chunkContent) - 1

		// Generate a unique ID for the chunk
		chunkHash := md5.Sum([]byte(fmt.Sprintf("%s:%d:%d", filePath, startLine, endLine)))
		chunkID := hex.EncodeToString(chunkHash[:])

		// Create the chunk
		chunk := models.CodeChunk{
			ID:         chunkID,
			FilePath:   filePath,
			Content:    chunkContent,
			StartLine:  startLine,
			EndLine:    endLine,
			Imports:    imports,
			TokenCount: c.estimateTokenCount(chunkContent),
			Context:    importText,
			References: make(map[string]string),
		}

		chunks = append(chunks, chunk)
	}

	return chunks
}

// refineChunks further splits chunks that exceed the maximum size
func (c *Chunker) refineChunks(chunks []models.CodeChunk) []models.CodeChunk {
	var result []models.CodeChunk

	for _, chunk := range chunks {
		// If chunk is small enough, add it directly
		if chunk.TokenCount <= c.MaxChunkSize {
			result = append(result, chunk)
			continue
		}

		// Split large chunk
		subChunks := c.splitLargeChunk(chunk)
		result = append(result, subChunks...)
	}

	return result
}

// splitLargeChunk splits a large chunk into smaller ones
func (c *Chunker) splitLargeChunk(chunk models.CodeChunk) []models.CodeChunk {
	var subChunks []models.CodeChunk

	content := chunk.Content
	scanner := bufio.NewScanner(strings.NewReader(content))

	var currentContent strings.Builder
	currentStartLine := chunk.StartLine
	currentTokenCount := 0
	currentLineCount := 0

	// Process line by line
	for scanner.Scan() {
		line := scanner.Text()
		lineTokens := c.estimateTokenCount(line)

		// If adding this line would exceed the limit, create a new chunk
		if currentTokenCount > 0 && currentTokenCount+lineTokens > c.MaxChunkSize {
			// Generate a unique ID for the chunk
			chunkHash := md5.Sum([]byte(fmt.Sprintf("%s:%d:%d", chunk.FilePath, currentStartLine, currentStartLine+currentLineCount-1)))
			chunkID := hex.EncodeToString(chunkHash[:])

			// Create the sub-chunk
			subChunk := models.CodeChunk{
				ID:         chunkID,
				FilePath:   chunk.FilePath,
				Content:    currentContent.String(),
				StartLine:  currentStartLine,
				EndLine:    currentStartLine + currentLineCount - 1,
				Imports:    chunk.Imports,
				Context:    chunk.Context,
				References: chunk.References,
				TokenCount: currentTokenCount,
			}

			subChunks = append(subChunks, subChunk)

			// Reset for next chunk
			currentContent.Reset()
			currentStartLine = currentStartLine + currentLineCount
			currentTokenCount = 0
			currentLineCount = 0
		}

		// Add line to current chunk
		currentContent.WriteString(line)
		currentContent.WriteString("\n")
		currentTokenCount += lineTokens
		currentLineCount++
	}

	// Don't forget the last chunk
	if currentTokenCount > 0 {
		// Generate a unique ID for the chunk
		chunkHash := md5.Sum([]byte(fmt.Sprintf("%s:%d:%d", chunk.FilePath, currentStartLine, currentStartLine+currentLineCount-1)))
		chunkID := hex.EncodeToString(chunkHash[:])

		// Create the sub-chunk
		subChunk := models.CodeChunk{
			ID:         chunkID,
			FilePath:   chunk.FilePath,
			Content:    currentContent.String(),
			StartLine:  currentStartLine,
			EndLine:    currentStartLine + currentLineCount - 1,
			Imports:    chunk.Imports,
			Context:    chunk.Context,
			References: chunk.References,
			TokenCount: currentTokenCount,
		}

		subChunks = append(subChunks, subChunk)
	}

	return subChunks
}

// countLines counts the number of lines in a string
func (c *Chunker) countLines(s string) int {
	return strings.Count(s, "\n") + 1
}

// estimateTokenCount provides a rough estimate of token count for a string
// This is a simplistic model - in practice, you'd use a more accurate tokenizer
func (c *Chunker) estimateTokenCount(s string) int {
	// A very rough approximation: each word is about 1.3 tokens
	words := len(strings.Fields(s))
	return int(float64(words) * 1.3)
}
