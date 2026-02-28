---
name: technical-design
description: Manages design documentation and ensures deisgn is kept current and code changes align with  design. Use when making any change to the design of the system, and to any code, including creating new modules, refactoring existing code, or updating technical design documents across the directory hierarchy.
---

# Technical Design 
 Defines how the technical design is stractured and maintained throughout the project. Defines what needs to be added to the `TECHNICAL_DESIGN.md` at each level of the hierarchy, when to read it, and how to maintain it.

## Workflow

1. **When making code changes**:
   - Always start by reading the `TECHNICAL_DESIGN.md` in the directory you are working in, and all parent directories up to the root. This ensures you understand the design context before making any changes.
   - If your change spans multiple directories, ensure you read the `TECHNICAL_DESIGN.md` files in all relevant directories and all `TECHNICAL_DESIGN.md` files in parent directories to up to the root.
   - If your code changes are purely implementation details that do not require a change in the technical design, make the necessary code changes while ensuring they align with the existing design principles outlined in the `TECHNICAL_DESIGN.md` files. 
   - If the design conetext is not sufficient to make the code change, and you need more context, consider reading the `TECHNICAL_DESIGN.md` files in other directories in the hierarchy to understand the context. Refer to [technical-design-rules.md](references/technical-design-rules.md) to asses where the information you need might be.
   - If your code changes require a change in the technical design, see below.


2. **When making changes to the technical design or coming up with a new design**:
   - Refer to [technical-design-rules.md](references/technical-design-rules.md) to make sure you are writing things in the right `TECHNICAL_DESIGN.md` file.
   - If you are doing the design change as part of a code change, ensure that design changes are made in the same commit as the code changes.

3. **Validation**:
   - Ensure the code and documentation remain synchronized.
   - Update `TECHNICAL_DESIGN.md` at this folder and in all parent folders if the technical design has evolved.
