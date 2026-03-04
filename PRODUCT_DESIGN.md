# Mixtiles Assistant - Product Design

## Overview
The Mixtiles Assistant is a conversational AI designed to help users transform their digital photo memories into beautiful physical products (albums, canvas prints, mugs, etc.). It leverages photo metadata to provide personalized suggestions and uses a witty, charming personality to engage users.

## Core User Experience
1. **Immediate Engagement:** Users can start chatting immediately.
2. **Background Context:** The app analyzes photo metadata (timestamp, location, EXIF) in the background to discover "important days" and "trips".
3. **Personalized Discovery:** The assistant suggests products based on the user's life (e.g., "I see you have 200 photos from your trip to Greece, want to make an album?").
4. **Scoping & Refinement:** The assistant works with the user to narrow down which photos should be included in a product.

## Clarification Questions & Pickers
To streamline the scoping process, the assistant can present **Clarification Questions** paired with a **Picker UI**.

### Picker UI Interaction
- **Trigger:** The server includes a `picker` object in the chat response when a specific choice is needed.
- **Display:** The picker slides up from the bottom, appearing just above the text input field.
- **Options:** 
    - **Text Options:** Large, pill-shaped buttons in Mixtiles Pink (#FF3B6B).
    - **Image Options:** Square tiles (mimicking Mixtiles) showing faces, locations, or specific photo clusters.
- **Selection:** 
    - Clicking an option automatically sends that text/ID as the user's reply.
    - The picker slides back down immediately after selection.
- **Freedom of Input:** The user can ignore the picker and continue typing in the text field at any time. Sending a manual message also closes the picker.

### Use Case Examples
1. **Entity Identification:**
   - User: "I want to make an album for Betty."
   - Assistant: "I found several people who appear frequently in your photos. Which one is Betty?"
   - UI: Shows a picker with faces extracted from the metadata.
2. **Time Range Selection:**
   - Assistant: "How far back should we look for photos for this album?"
   - UI: Shows a picker with options: "Last Year", "Last 3 Years", "All Time".
3. **Trip Selection:**
   - Assistant: "Which of these recent trips are you thinking of?
   - UI: Shows a picker with "Greece Trip", "London Trip", "Weekend in Tel Aviv".

## Visual Brand Identity
- **Color Palette:** Primary Pink (#FF3B6B), Black (#222), Soft Gray (#F8F8F8).
- **Typography:** Manrope (Geometric Sans-Serif), All-Caps Logo.
- **Form Factor:** Clean, minimal, mobile-first design with smooth animations.
