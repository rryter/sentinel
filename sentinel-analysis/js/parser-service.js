const oxc = require("oxc-parser");

// Buffer to store incoming data
let inputData = "";
let fileCount = 0;
const startTime = Date.now();

// Listen for data on stdin
process.stdin.on("data", (chunk) => {
  inputData += chunk;
});

// Process the input when stream ends
process.stdin.on("end", () => {
  try {
    // Parse the input JSON
    const input = JSON.parse(inputData);
    const { filename, code } = input;

    fileCount++;

    // Parse the code using oxc-parser
    const result = oxc.parseSync(filename, code);

    // Calculate elapsed time
    const elapsedTime = Date.now() - startTime;

    // Send the complete result back as JSON
    const output = {
      success: true,
      ast: {
        ...result,
        filePath: filename, // Add filepath to AST
      },
      errors: result.errors || [],
      stats: {
        filesProcessed: fileCount,
        elapsedTimeMs: elapsedTime,
      },
    };

    console.log(JSON.stringify(output));
  } catch (error) {
    const output = {
      success: false,
      error: error.message,
      stats: {
        filesProcessed: fileCount,
        elapsedTimeMs: Date.now() - startTime,
      },
    };
    console.log(JSON.stringify(output));
  }
});
