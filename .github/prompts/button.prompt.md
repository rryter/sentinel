---
tools: ["githubRepo", "codebase", "resolve-library-id", "get-library-docs"]
description: "Add Spartan Button"
---

Your goal is to add a button from the Spartan Library to the current HTML file. Also update the coresponding
typescript file and the necessary imports "\*.component.ts"

Use context7

Requirements for the button:

- Always a Test ID `data-test` to be later used by play-wright
  - The Test ID should be recognizable aka use the name of the component as a prefix
- Only add the "variant" if explicitely requested
