const oxc = require("oxc-parser");
const fs = require("fs");

// Buffer to store incoming data
let inputData = "";
let fileCount = 0;
const startTime = Date.now();

// Add logging function
function log(message) {
  fs.appendFileSync(
    "/tmp/parser-service.log",
    `${new Date().toISOString()} - ${message}\n`
  );
}

log("Parser service started");

// Listen for data on stdin
process.stdin.on("data", (chunk) => {
  log(`Received data chunk: ${chunk.length} bytes`);
  inputData += chunk;
});

// Process the input when stream ends
process.stdin.on("end", () => {
  log("Stdin stream ended, processing input");
  try {
    // Parse the input JSON
    log(`Raw input data: ${inputData}`);
    const input = JSON.parse(inputData);
    const { filename, code } = input;

    log(`Processing file: ${filename}, code length: ${code.length}`);
    fileCount++;

    // Parse the code using oxc-parser
    log("Calling oxc-parser");
    const result = oxc.parseSync(filename, code);
    log("Parsing completed");

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

    log("Sending successful response");
    console.log(JSON.stringify(output));
    log("Response sent");
  } catch (error) {
    log(`Error: ${error.message}\n${error.stack}`);
    const output = {
      success: false,
      error: error.message,
      stats: {
        filesProcessed: fileCount,
        elapsedTimeMs: Date.now() - startTime,
      },
    };
    console.log(JSON.stringify(output));
    log("Error response sent");
  }
  log("Parser service completed processing");
});

log("Parser service initialized and waiting for input");
