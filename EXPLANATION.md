# Project Explanation

This document covers the operational details of the Text2Block project, including the planning process, tool usage, memory management, limitations, and specific use cases.

## 1. Planning & Process

The implementation followed a structured approach:
-   **Frontend-First Design**: We prioritized building a responsive UI (`QueryInterface`) that could handle various backend states (Generic, Tutorial, Error) before the fully functional backend was available.
-   **Mock Mode Strategy**: To enable rapid frontend iteration, we implemented a robust "Mock Mode" in `api.ts`. This allowed us to validate user flows, animations, and error handling without dependencies on the external Python service.
-   **State Machine Logic**: The UI was designed as a finite state machine to manage the complexity of asynchronous API calls and user interactions, ensuring a deterministic and bug-free user experience.

## 2. Tool Use

-   **React & TypeScript**: Chosen for type safety and component reusability.
-   **Supabase**: utilized for secure user authentication and storing user profiles as JSONB, allowing for flexible schema evolution.
-   **Tailwind CSS**: Used for rapid, utility-first styling consistent with the "Deep Space Zen" aesthetic.
-   **Mocking**: The `USE_MOCK_MODE` flag in `services/api.ts` allows developers to toggle between simulated responses and real network calls, facilitating isolated testing.

## 3. Memory & State Management

-   **Session State**: The application uses React's `useState` and `useRef` to manage the immediate session. The `QueryInterface` does not maintain a long-running chat history like a traditional chatbot; instead, it focuses on the *current* query context to keep the interface clean.
-   **User Profile**: Profile data is fetched once upon dashboard load and passed down to components, minimizing database reads.
-   **Context Retention**: While the current query is active, the application retains the "Optimized Prompt" state, allowing the user to refine the AI's suggestion before committing to the expensive tutorial generation process.

## 4. Limitations (Current)

-   **Mocked Tutorial Generation**: The `generateTutorial` API endpoint is currently mocked on the frontend. While the `optimizePrompt` logic is ready for the backend, the final content generation returns simulated data.
-   **No Persistent Chat History**: The system is designed to be ephemeral for queries; it does not save previous "Generic" Q&A sessions to the database, though Tutorial sessions are saved as articles.
-   **Single-Turn Optimization**: The optimization flow is currently single-turn (User -> AI Optimization -> User Accept). It does not support a multi-turn conversation *about* the optimization itself yet.

## 5. Use Cases

This system is designed to be a powerful educational engine. Here are the core use cases:

*   **Convert Project README to Tutorial**:
    Take a technical README file and transform it into a step-by-step interactive tutorial, making onboarding for new developers significantly easier.

*   **Idea to Actionable Steps**:
    Input a raw idea (e.g., "I want to build a to-do app"), and receive a structured breakdown with architectural flowcharts, database schemas, and implementation steps.

*   **Education & Deep Learning**:
    "Teach me React Hooks" - The system doesn't just dump documentation. It creates a tailored lesson plan based on your specific background (e.g., "Explain it to a Senior Java Developer"), using analogies and examples that resonate with your experience.

*   **Concept Exploration**:
    Great for rapidly learning new concepts. Ask "What is a vector database?" to get a concise, accurate answer without wading through SEO-spam articles.

## 6. Future Improvements

We have planned several enhancements to expand the system's capabilities:

-   **File Parsing**: Add an "Add File" button to the query interface, allowing users to upload context (like a code file or PDF) for the AI to analyze.
-   **Continuous Dialogue**: Enable a conversational mode with the generated tutorial, allowing users to ask specific questions about sections of the generated content ("Explain step 3 in more detail").
-   **Voice Input**: Integrate speech-to-text to allow for hands-free querying and interaction.

## 7. Running the Project

### Backend Setup
Follow these steps to set up and run the Python backend:

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment:**
    *   **Windows:**
        ```bash
        .\venv\Scripts\activate
        ```
    *   **Mac/Linux:**
        ```bash
        source venv/bin/activate
        ```

4.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the application:**
    ```bash
    uvicorn app.main:app --reload
    ```

### Frontend Setup
Follow these steps to set up and run the React frontend:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

