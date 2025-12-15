/**
 * Centralized API Service for Backend Communication
 * Handles all HTTP requests to the external Python backend
 */

import { UserProfile } from '../types/profile';
import { TutorialPayload } from './conversations';

// Base URL Configuration
// Default: localhost:8000
// Override with environment variable for deployment
const BASE_URL = 'http://localhost:8000';

// 🧪 MOCK MODE TOGGLE
// Set to true to test UI without backend
// Set to false to use real backend
const getMockMode = (): boolean => {
  // Check for Node.js environment variable (used in tests)
  if (typeof process !== 'undefined' && process.env.VITE_USE_MOCK_MODE !== undefined) {
    return process.env.VITE_USE_MOCK_MODE === 'true';
  }
  // Check for Vite environment variable (used in frontend)
  try {
    if (import.meta.env && import.meta.env.VITE_USE_MOCK_MODE !== undefined) {
      return import.meta.env.VITE_USE_MOCK_MODE === 'true';
    }
  } catch (e) {
    // Ignore error if import.meta is not defined
  }
  return true; // Default to MOCK MODE
};

const USE_MOCK_MODE = getMockMode();
/**
 * Response type from optimize_prompt API
 */
export type ApiResponse =
  | { mode: 'ERROR'; payload: string }
  | { mode: 'EDIT_MODE'; payload: string }
  | { mode: 'DISPLAY_MODE'; payload: string };

/**
 * Raw API response structure
 */
interface RawApiResponse {
  type?: 'tutorial' | 'generic';
  optimized_prompt?: string;
  response?: string;
  detail?: {
    message?: string;
  };
}

/**
 * Mock optimize_prompt responses for testing
 * This simulates different backend responses based on keywords in the query
 */
const mockOptimizePrompt = async (
  userQuery: string,
  userProfile: UserProfile
): Promise<ApiResponse> => {
  console.log('[API MOCK] Optimize Prompt - Processing query:', userQuery);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const query = userQuery.toLowerCase();

  // Test Case 1: Trigger ERROR response
  if (query.includes('error') || query.includes('fail')) {
    console.log('[API MOCK] Returning ERROR response');
    return {
      mode: 'ERROR',
      payload: 'This is a mock error for testing. Try queries without "error" keyword.',
    };
  }

  // Test Case 2: Trigger GENERIC response (questions, simple queries)
  if (
    query.includes('what') ||
    query.includes('who') ||
    query.includes('when') ||
    query.includes('where') ||
    query.includes('?') ||
    query.includes('explain') ||
    query.includes('is')
  ) {
    console.log('[API MOCK] Returning GENERIC response');
    return {
      mode: 'DISPLAY_MODE',
      payload: `Mock Response: "${userQuery}"\n\nThis is a simulated generic response. The system detected this as a direct question that doesn't require a full tutorial.\n\nIn production, the AI would analyze your question and provide a comprehensive answer based on your profile:\n- Education: ${userProfile.education_level}\n- Experience: ${userProfile.experience_level}\n\nTry queries starting with "teach me" or "create tutorial" to see the tutorial flow!`,
    };
  }

  // Test Case 3: Trigger TUTORIAL response (learning requests)
  console.log('[API MOCK] Returning TUTORIAL response');
  return {
    mode: 'EDIT_MODE',
    payload: `Create a comprehensive tutorial on "${userQuery}" tailored for a learner with ${userProfile.education_level} education and ${userProfile.experience_level} experience.\n\nThe tutorial should include:\n\n1. **Introduction & Context**\n   - Historical background and importance\n   - Real-world applications\n   - Prerequisites and learning objectives\n\n2. **Core Concepts**\n   - Fundamental principles explained step-by-step\n   - Key terminology and definitions\n   - Visual diagrams and flowcharts\n\n3. **Practical Examples**\n   - Hands-on code examples (if applicable)\n   - Common use cases and patterns\n   - Best practices and pitfalls to avoid\n\n4. **Advanced Topics**\n   - Deep dive into complex aspects\n   - Performance considerations\n   - Integration with other technologies\n\n5. **Practice & Resources**\n   - Exercises and projects\n   - Further reading and references\n   - Community resources\n\nStyle: Clear, engaging, with code snippets and diagrams.\nLength: Comprehensive (~15-20 minute read)\nTone: Educational but approachable`,
  };
};

/**
 * Optimize Prompt - Main API Call
 * 
 * @param userQuery - The user's input query/question
 * @param userProfile - The user profile object from Supabase (user_profile JSONB column)
 * @returns Structured response with mode and payload
 * 
 * @example
 * const result = await optimizePrompt("teach me react", userProfile);
 * if (result.mode === 'EDIT_MODE') {
 *   // Show optimization view with result.payload
 * }
 */
export const optimizePrompt = async (
  userQuery: string,
  userProfile: UserProfile
): Promise<ApiResponse> => {
  // Use mock if enabled
  if (USE_MOCK_MODE) {
    return mockOptimizePrompt(userQuery, userProfile);
  }

  try {
    // 1. Map Supabase keys to backend's expected structure
    const payload = {
      user_query: userQuery,
      user_profile: {
        education: userProfile.education_level,      // Supabase → Backend mapping
        experience: userProfile.experience_level,    // Supabase → Backend mapping
        introduction: userProfile.user_introduction, // Supabase → Backend mapping
      },
    };

    console.log('[API] Sending request to:', `${BASE_URL}/api/optimize-prompt`);
    console.log('[API] Payload:', payload);

    // 2. Send POST request
    const response = await fetch(`${BASE_URL}/api/optimize-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 3. Parse JSON response
    const data: RawApiResponse = await response.json();
    console.log('[API] Response received:', data);

    // 4. Handle Response Cases

    // Case 1: Error (Missing "type" key or HTTP error)
    if (!response.ok || !data.type) {
      const errorMessage = data.detail?.message || 'Unknown API Error';
      console.error(`[API] Optimize Prompt Error (${response.status}):`, errorMessage);
      return {
        mode: 'ERROR',
        payload: errorMessage,
      };
    }

    // Case 2: Tutorial Flow
    if (data.type === 'tutorial') {
      if (!data.optimized_prompt) {
        return {
          mode: 'ERROR',
          payload: 'Tutorial response missing optimized_prompt field',
        };
      }

      console.log('[API] Tutorial mode activated');
      return {
        mode: 'EDIT_MODE',
        payload: data.optimized_prompt,
      };
    }

    // Case 3: Generic Flow
    if (data.type === 'generic') {
      if (!data.response) {
        return {
          mode: 'ERROR',
          payload: 'Generic response missing response field',
        };
      }

      console.log('[API] Generic mode - displaying direct response');
      return {
        mode: 'DISPLAY_MODE',
        payload: data.response,
      };
    }

    // Fallback: Unexpected response type
    return {
      mode: 'ERROR',
      payload: `Unexpected response type: ${data.type}`,
    };

  } catch (error: any) {
    console.error('[API] Request failed:', error);

    // Network or parsing errors
    return {
      mode: 'ERROR',
      payload: error.message || 'Failed to connect to backend service',
    };
  }
};

/**
 * Health Check - Verify backend connectivity
 * @returns true if backend is reachable
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('[API] Health check failed:', error);
    return false;
  }
};

/**
 * Get configured base URL (useful for debugging)
 */
export const getBaseUrl = (): string => BASE_URL;

/**
 * Generate Tutorial - Creates full tutorial content
 * 
 * @param optimizedPrompt - The refined/optimized prompt from edit mode
 * @returns Tutorial payload with markdown content and assets
 * 
 * NOTE: Set USE_MOCK_MODE = false and ensure backend is running on localhost:8000
 */
/**
 * Generate Tutorial Stream - Streamed response for real-time status
 * 
 * @param optimizedPrompt - The refined/optimized prompt
 * @param userProfile - User profile for context
 * @returns ReadableStream of bytes (text encoder)
 */
export const generateTutorialStream = async (
  optimizedPrompt: string,
  userProfile?: UserProfile
): Promise<ReadableStream<Uint8Array>> => {
  
  if (USE_MOCK_MODE) {
    console.log('[API MOCK] Generate Stream - Starting simulation...');
    
    // Create a mock stream that emits status updates then the result
    return new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (data: any) => {
          console.debug('[API MOCK] Emitting chunk:', data.type);
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
        };

        // 1. Send Status Updates
        const statuses = [
          "Searching knowledge base for concepts...",
          "Analyzing best teaching methods...",
          "Drafting content structure...",
          "Generating illustrative diagrams...",
          "Finalizing tutorial formatting..."
        ];

        for (const status of statuses) {
          emit({ type: 'status', message: status });
          // Random delay between 800ms and 1500ms
          await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
        }

        // 2. Send Result (Simulated Tutorial Payload)
        const mockResult: TutorialPayload = {
          tutorial_content: `## Introduction to XGBoost

XGBoost (eXtreme Gradient Boosting) is a powerful machine learning algorithm dominated by decision trees. Unlike a single tree, it builds an ensemble of trees sequentially, where each new tree corrects the errors of the previous ones.

### How it Works

The algorithm minimizes a regularized objective function combining a convex loss function (based on the difference between the predicted and target outputs) and a penalty term for model complexity.

Here is a visual representation of how the trees are built sequentially to minimize error:

![XGBoost Architecture Diagram](gen_id_1)

---

### Python Implementation

Below is a complete script to train a classifier on synthetic data. We generate a dataset, split it, train the XGBoost model, and output predictions.

<interactive-code>
python
import xgboost as xgb
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# 1. Generate dummy dataset
X, y = make_classification(n_samples=1000, n_features=10, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# 2. Initialize and Train XGBoost
clf = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss')
clf.fit(X_train, y_train)

# 3. Make Predictions
preds = clf.predict(X_test)
accuracy = accuracy_score(y_test, preds)

print(f"Model Accuracy: {accuracy * 100:.2f}%")
</interactive-code>

### Visualization of Results

After training, it is often useful to look at feature importance to understand which variables had the most impact on the model:

![Feature Importance Plot](ret_id_1)

This concludes the basic setup.`,
          assets: {
            "gen_id_1": {
              type: "url",
              data: "s3://t2b-image-retrieval/flow-diagram/d22d1b2c-d492-41f7-9752-2ef3d8624289.jpeg"
            },
            "ret_id_1": {
              type: "url",
              data: "s3://t2b-image-retrieval/flow-diagram/b05e1d34-98cf-4e14-ae48-e207db2f4399.jpeg"
            }
          }
        };

        emit({ type: 'result', data: mockResult });
        
        console.log('[API MOCK] Stream finished');
        controller.close();
      }
    });
  }

  // Real Backend Call
  try {
    console.log('[API] Generate Stream - Connecting to:', `${BASE_URL}/api/generate-stream`);
    const response = await fetch(`${BASE_URL}/api/generate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: optimizedPrompt,
        user_profile: userProfile 
      }),
    });

    if (!response.ok || !response.body) {
      console.error(`[API] Generate Stream Failed (${response.status}):`, response.statusText);
      throw new Error(`Failed to start generation stream: ${response.status} ${response.statusText}`);
    }

    console.log('[API] Generate Stream - Connection established');
    return response.body;

  } catch (error: any) {
    console.error('[API] Generate Stream Error:', error);
    throw new Error(error.message || 'Stream connection failed');
  }
};
