
import { optimizePrompt, generateTutorialStream } from '../services/api';
import { UserProfile } from '../types/profile';

/**
 * BACKEND INTEGRATION TEST SUITE
 * 
 * Purpose: Verify real backend connectivity and logic for both core workflows.
 * Usage: 
 * 1. Ensure backend is running at http://localhost:8000
 * 2. Set USE_MOCK_MODE = false in src/services/api.ts
 * 3. Run: npx tsx src/test/backend_integration_test.ts
 */

const mockProfile: UserProfile = {
  education_level: 'Bachelor in Computer Science',
  experience_level: 'Intermediate',
  user_introduction: 'I am a software engineer looking to learn new technologies.'
};

async function runTest(name: string, testFn: () => Promise<void>) {
  console.log(`\n🔵 STARTING TEST: ${name}`);
  try {
    await testFn();
    console.log(`✅ PASSED: ${name}`);
  } catch (error: any) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    process.exit(1); // Fail fast
  }
}

async function main() {
  console.log('🚀 Starting Backend Integration Tests...');
  console.log('⚠️  Ensure USE_MOCK_MODE is set to FALSE in api.ts');
  console.log('⚠️  Ensure Backend is running at localhost:8000\n');

  // TEST 1: System Health Check
  await runTest('Backend Health Check', async () => {
    try {
      const res = await fetch('http://localhost:8000/health');
      if (!res.ok) throw new Error(`Health check failed with status: ${res.status}`);
      const data = await res.json();
      console.log('   Server Status:', data);
    } catch (e) {
      throw new Error('Could not connect to backend. Is it running?');
    }
  });

  // TEST 2: Generic Workflow (Simple Question)
  await runTest('Generic Workflow (Direct Answer)', async () => {
    const simpleQuery = "What is the capital of France?";
    console.log(`   Sending Query: "${simpleQuery}"`);

    const result = await optimizePrompt(simpleQuery, mockProfile);

    if (result.mode !== 'DISPLAY_MODE') {
      throw new Error(`Expected DISPLAY_MODE but got ${result.mode}. Payload: ${result.payload}`);
    }
    
    if (!result.payload || result.payload.length < 2) {
      throw new Error('Received empty or invalid payload for generic response');
    }

    console.log('   Received Answer:', result.payload.substring(0, 50) + '...');
  });

  // TEST 3: Tutorial Workflow (Optimization + Generation)
  await runTest('Tutorial Workflow (Optimize + Stream)', async () => {
    const tutorialQuery = "Teach me how to use Docker for beginners";
    console.log(`   Sending Query: "${tutorialQuery}"`);

    // Step A: Optimization
    const optResult = await optimizePrompt(tutorialQuery, mockProfile);

    if (optResult.mode !== 'EDIT_MODE') {
      throw new Error(`Expected EDIT_MODE but got ${optResult.mode}. Payload: ${optResult.payload}`);
    }

    console.log('   Optimization Successful.');
    console.log('   Optimized Prompt:', optResult.payload.substring(0, 50) + '...');

    // Step B: Streaming Generation
    console.log('   Starting Generation Stream...');
    const stream = await generateTutorialStream(optResult.payload, mockProfile);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    let receivedChunks = 0;
    let hasStatus = false;
    let hasResult = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedChunks++;
      const chunkStr = decoder.decode(value, { stream: true });
      
      // Basic validation of stream content
      const lines = chunkStr.split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'status') hasStatus = true;
          if (data.type === 'result') hasResult = true;
        } catch (e) {
          // Ignore partial chunks
        }
      }
    }

    console.log(`   Stream Finished. Received ${receivedChunks} chunks.`);
    
    if (!hasStatus) console.warn('   ⚠️  Warning: No status updates received in stream');
    if (!hasResult) throw new Error('Stream finished but no final "result" payload was received');
  });

  console.log('\n✨ ALL TESTS PASSED SUCCESSFULLY ✨');
}

main();
