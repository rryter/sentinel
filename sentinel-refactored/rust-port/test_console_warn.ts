// Test file for console.warn rule

function testFunction() {
  // This should trigger our rule
  console.warn('This is a warning');
  
  // This should also trigger our rule
  console.warn('Another warning', { data: 'some data' });
  
  // These should not trigger our specific rule (but might trigger no-console)
  console.log('This is just a log');
  console.error('This is an error');
}

// Another example with a variable
const logger = console;
logger.warn('Warning through variable'); // This is more complex to detect

export default testFunction; 