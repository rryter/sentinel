const oxc = require("oxc-parser");

// Example TypeScript code to parse
const code = `
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "John",
  age: 30
};

export function getUser(): User {
  return user;
}
`;

// Parse the code
const filename = "example.ts";
const result = oxc.parseSync(filename, code);

// Print the results
console.log("AST:", JSON.stringify(result.program, null, 2));
console.log("\nErrors:", result.errors);
console.log("\nModule Info:", result.module);
