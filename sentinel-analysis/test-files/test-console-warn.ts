// This is a test file with a console.warn call

function testFunction() {
  // This should trigger our rule
  console.warn("This is a warning message");
  
  // These should not trigger the rule
  console.log("This is a log message");
  console.error("This is an error message");
}

// Another console.warn call
console.warn("Another warning", { data: true });

// More complex case
const logger = {
  warn: function(msg: string) {
    console.warn(`Logger says: ${msg}`);
  }
};

logger.warn("Warning through logger"); 