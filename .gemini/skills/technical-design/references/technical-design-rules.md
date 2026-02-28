# Technical Design in this project

This document defines how design artifacts are managed within this project.

## 1. Additive Hierarchy Structure
Every level of the directory tree should have a design "Source of Truth" document: `TECHNICAL_DESIGN.md`. The document should only contain the design for the components in this directory. Higher level design should be defined in parent folders. Lower level design should be in subfolders. Code changes will be made with the context of all the hirarcy loaded.

## 2. The "Design-First" Protocol
- **Discovery**: Before editing any code or making any design changes, the agent MUST locate and load the `TECHNICAL_DESIGN.md` of all design document up the hirarchy AT LEAST. If needed, it CAN loads other `TECHNICAL_DESIGN.md` documents in the tree.
- **Brevity**: `TECHNICAL_DESIGN.md` files should be designed to be read in the contex of other `TECHNICAL_DESIGN.md` documents up the tree so don't need to repeat the information in them.
- **Constraint**: Code changes must not violate the principles in the design documents without a corresponding update to the relevant documents.
- **Creation**: All folders containing non trivial code should have a `TECHNICAL_DESIGN.md` file explaining the technical design.

## 3. TECHNICAL_DESIGN.md Template
Every `TECHNICAL_DESIGN.md` should briefly cover:
- **Responsibility**: What is this folder's job?
- **Public API**: What functions/classes are meant for external use?
- **State/Data**: How does this folder manage data or internal state?
- **Dependencies**: Which other folders or external libraries does this rely on?

## 4. Maintenance
- Design documents are "living." They must be updated in the same task/commit as the code they describe.
- When a module is deleted, its `TECHNICAL_DESIGN.md` is deleted.
- When a module is refactored, the `TECHNICAL_DESIGN.md` is updated first.
