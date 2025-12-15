
import { generateTutorialStream } from '../services/api';

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

async function runTest() {
  console.log('--- TEST START: Streaming ---');
  try {
    const stream = await generateTutorialStream('Test Prompt', mockProfile);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const json = JSON.parse(line);
                console.log('[Test] Valid JSON:', json.type);
            } catch (e) {
                console.log('[Test] CAUGHT ERROR: Invalid JSON encountered (SAFE)');
            }
        }
    }
    console.log('--- TEST PASS: Stream completed safely --');
  } catch (e: any) {
    console.error('--- TEST FAIL ---');
    console.error(e);
  }
}

runTest();
