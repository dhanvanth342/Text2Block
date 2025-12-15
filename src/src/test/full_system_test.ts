
import { optimizePrompt, generateTutorialStream } from '../services/api';

// Mock UserProfile
const mockProfile = {
  id: 'test-user',
  full_name: 'Tester',
  email: 'test@example.com',
  education_level: 'Beginner',
  experience_level: 'Novice',
  user_introduction: 'Test user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

async function runTestScenario(name: string, fn: () => Promise<void>) {
  console.log(`\n=== SCENARIO: ${name} ===`);
  try {
    await fn();
    console.log(`=== ${name}: PASS ===`);
  } catch (e: any) {
    console.log(`=== ${name}: FAIL (Unexpected Error) ===`);
    console.error(e);
  }
}

async function main() {
  console.log('Starting Full System Test Suite...');

  // TEST 1: Happy Path (Optimization + Generation)
  await runTestScenario('Happy Path', async () => {
    // 1. Optimize
    const optResult = await optimizePrompt('Teach me Python', mockProfile);
    if (optResult.mode !== 'EDIT_MODE') throw new Error('Optimization failed');
    console.log('[Test] Optimization successful:', optResult.payload);

    // 2. Generate Stream
    const stream = await generateTutorialStream(optResult.payload, mockProfile);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    while(true) {
        const {done, value} = await reader.read();
        if(done) break;
        // Just consume stream
    }
    console.log('[Test] Stream completed successfully');
  });

  // TEST 2: Optimization Error
  await runTestScenario('Optimization Error', async () => {
    const result = await optimizePrompt('FORCE_ERROR_PLEASE', mockProfile);
    if (result.mode === 'ERROR' && result.payload.includes('Simulated')) {
        console.log('[Test] Correctly received error payload:', result.payload);
    } else {
        throw new Error('Did not receive expected error mode');
    }
  });

  // TEST 3: Generation Stream Connection Failure
  await runTestScenario('Stream Connection Failure', async () => {
    try {
        const stream = await generateTutorialStream('FORCE_ERROR_CONNECTION', mockProfile);
        const reader = stream.getReader();
        // Trigger read to get error
        await reader.read(); 
        throw new Error('Should have thrown error on read');
    } catch (e: any) {
        if (e.message.includes('Simulated Network Connection Failed')) {
            console.log('[Test] Caught expected stream error:', e.message);
        } else {
            throw e;
        }
    }
  });
}

main();
