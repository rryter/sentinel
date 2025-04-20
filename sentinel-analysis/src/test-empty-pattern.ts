// Test file for no-empty-pattern rule
function test() {
  // This should trigger the empty pattern rule
  const {} = {};
  const [] = [];
}
