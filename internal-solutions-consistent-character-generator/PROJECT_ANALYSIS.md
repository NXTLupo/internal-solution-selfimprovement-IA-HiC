# Project Analysis: Consistent Persona Scene Generator

## 1. Project Overview

This document provides a comprehensive analysis of the "Consistent Persona Scene Generator" application. The application's purpose is to allow users to create consistent visual representations of characters using AI and then place these characters into various user-described scenes. It leverages the Google Gemini API for image generation and IndexedDB for client-side storage of characters.

## 2. User Stories

The following user stories define the core requirements and functionalities of the application from the perspective of a creative user (e.g., writer, artist, game master).

-   **US-1: Character Definition (Text)**: As a creative user, I want to define a character by writing a text description, so that I can create a visual representation from my imagination.
-   **US-2: Character Generation (Text)**: As a creative user, I want to generate a unique, high-quality portrait of a character based on my text description, so that I have a consistent visual reference.
-   **US-3: Character Definition (Image Upload)**: As a creative user, I want to upload an image containing one or more people, so that I can extract them as individual characters for my scenes.
-   **US-4: Character Generation (Image Upload)**: As a creative user, I want the application to identify each person in my uploaded image and generate an isolated, high-quality portrait for each one, so I can use them as individual character references.
-   **US-5: Multiple Character Generation**: As a creative user, I want to define and generate multiple characters at once (from both text and image inputs), so that I can build my cast of characters efficiently.
-   **US-6: Character Naming and Saving**: As a creative user, I want to be prompted to name newly generated characters and save them, so that I can easily identify and reuse them later.
-   **US-7: Persistent Character Library**: As a creative user, I want my saved characters to be stored persistently in my browser, so that I don't lose my work when I close the tab or browser.
-   **US-8: Character Management**: As a creative user, I want to view all my saved characters in a gallery and be able to delete characters I no longer need, so that I can manage my character library.
-   **US-9: Character Selection for Scenes**: As a creative user, I want to select one or more characters from my saved library, so that I can include them in a new scene.
-   **US-10: Scene Definition**: As a creative user, I want to write a text description for a scene, so that I can specify the environment, action, and mood.
-   **US-11: Scene Generation**: As a creative user, I want to generate a new image that places my selected characters into the scene I described, ensuring the characters' appearances remain consistent with their portraits.
-   **US-12: Scene Aspect Ratio Control**: As a creative user, I want to choose an aspect ratio (e.g., square, landscape, portrait) for my generated scene, so that it fits my intended use case.
-   **US-13: View and Download Scenes**: As a creative user, I want to see a gallery of my generated scenes and be able to download them, so that I can use the images elsewhere.
-   **US-14: Loading and Error Feedback**: As a creative user, I want to see clear loading indicators when the AI is generating images and receive understandable error messages if something goes wrong, so that I know the application's status.

## 3. Bug List & Issues

Based on a thorough review of the application against the user stories, the following bugs, issues, and areas for improvement have been identified.

| ID | Severity | Title | Description |
| --- | --- | --- | --- |
| BUG-01 | Minor | **State Loss on Refresh for Scenes** | Generated scenes are stored only in component state and are lost when the page is reloaded. Unlike characters, they are not persisted in IndexedDB, which can lead to data loss and a poor user experience. |
| BUG-02 | Minor | **No Character Editing** | Once a character is saved, their name and AI description cannot be modified. The only way to change a character's details is to delete them and generate them again, which is inefficient. |
| BUG-03 | Low | **No Bulk Download** | Users can only download generated scenes and character portraits individually. There is no feature to download multiple selected items or an entire gallery as a zip archive. |
| BUG-04 | Low | **Confusing UI for Image Upload** | The relationship between the text description field and the image upload function is unclear. The description can act as a hint for image extraction, but the UI presents them as equal alternatives, which may confuse users. |
| BUG-05 | Low | **Unclear Empty State for Inputs** | If a user removes all character input fields from the "Define Characters" section, the area becomes blank. There is no clear prompt or button to guide the user on how to add a new input field. |
| BUG-06 | Trivial | **Unused Code File** | The file `components/DownloadModal.tsx` exists in the codebase but is empty. This constitutes dead code and should either be implemented or removed to maintain code hygiene. |
| BUG-07 | Minor | **Accessibility Gaps** | The application has several accessibility shortcomings, including a lack of focus management in modals (focus is not trapped), and the main error banner does not use `aria-live`, meaning screen readers may not announce new errors as they appear. |


## 4. Development Checklist

This checklist outlines the development tasks required to address the identified bugs and implement key feature enhancements.

### High Priority
-   [ ] **Implement Scene Persistence:**
    -   [ ] Create a `scenes` object store in IndexedDB.
    -   [ ] Implement `addSceneToDB`, `loadScenesFromDB`, and `deleteSceneFromDB` functions in `geminiService.ts`.
    -   [ ] Integrate these functions into `App.tsx` to load scenes on mount, save new scenes on generation, and enable scene deletion from the gallery.

### Medium Priority
-   [ ] **Implement Character Editing:**
    -   [ ] Add an `updateCharacterInDB` function to `geminiService.ts`.
    -   [ ] Add an "Edit" icon to the character `ImageCard` component.
    -   [ ] Create or adapt a modal to allow users to edit a character's name and description.
    -   [ ] On save, update the character in both IndexedDB and the application's state.

-   [ ] **Improve Accessibility:**
    -   [ ] Add `aria-live="polite"` to the main error display `div` to ensure screen readers announce errors.
    -   [ ] Implement focus trapping within all modals (`CharacterNamingModal` and any new modals) to prevent focus from escaping to the background content.
    -   [ ] Review all interactive elements for proper `aria-label`s and roles.

### Low Priority
-   [ ] **Add Bulk Download Feature:**
    -   [ ] Add a "Select All" and "Download Selected" functionality to both galleries.
    -   [ ] Integrate a client-side zipping library (e.g., `jszip`).
    -   [ ] Implement a function that takes selected items, creates a zip archive of their images, and triggers a download.

-   [ ] **Enhance UI/UX:**
    -   [ ] Redesign the character input component to clarify the roles of text description and image upload.
    -   [ ] Add a prominent "Add Character" button or message that appears when the character input list is empty.

-   [ ] **Code Cleanup:**
    -   [ ] Remove the empty and unused `components/DownloadModal.tsx` file.
