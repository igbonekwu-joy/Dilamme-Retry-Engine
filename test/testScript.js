import env from '../src/config/env.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const BASE_URL = `http://localhost:${env.PORT || 5000}`;
const MOCK_URL = 'http://localhost:4000';

// Helper: submit a job to the base retry engine
async function submitJob(url, method = 'GET', options = {}) {
  const res = await fetch(`${BASE_URL}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, method, ...options }),
  });
  return res.json();
}

// rechecks until status is no longer pending/processing/retrying
async function pollUntilDone(id, timeoutMs = 60000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE_URL}/requests/${id}`);
    const data = await res.json();

    const activeStatuses = ['pending', 'processing', 'retrying'];

    if (!activeStatuses.includes(data.status)) {
      return data; // return final state
    }

    // Print current status while waiting
    process.stdout.write(`\r  Status: ${data.status} — attempts so far: ${data.attemptCount}`);

    await wait(1000); // check every second
  }

  throw new Error(`Job ${id} did not finish within ${timeoutMs}ms`);
}

// print attempt history
function printAttempts(attempts) {
  if (!attempts || attempts.length === 0) {
    console.log('  No attempts recorded');
    return;
  }

  attempts.forEach((a, i) => {
    const wait = i === 0
      ? 'immediately'
      : `after ${((attempts[i].createdAt - attempts[i - 1].createdAt) / 1000).toFixed(2)}s wait`;

    console.log(
      `  Attempt #${a.attemptNum} — ${wait} — status: ${a.status} — statusCode: ${a.statusCode} — duration: ${a.duration}ms`
    );
  });
}

// First test: Fails 3 times, then succeeds
async function testMockEndpoint() {
  console.log('First Test: Fails 3 times, then succeeds');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Reset mock server call counts first
  await fetch(`${MOCK_URL}/reset`, { method: 'POST' });

  const { id } = await submitJob(`${MOCK_URL}/mock`, 'POST', {
    maxRetries: 5,
    backoffMs: 1000,
  });

  console.log(`Submitted job: ${id}`);
  console.log('Waiting for job to complete...\n');

  const result = await pollUntilDone(id);

  console.log('\n');
  console.log(`Final status:   ${result.status}`);
  console.log(`Total attempts: ${result.attemptCount}`);
  console.log('\nAttempt history (notice wait times doubling):');
  printAttempts(result.attempts);

  // Assert it succeeded
  if (result.status === 'completed') {
    console.log('\n✓ PASSED — job eventually succeeded after failures');
  } else {
    console.log('\n✗ FAILED — expected completed, got:', result.status);
  }
}

// ─────────────────────────────────────────
// TEST 2: 4xx — should NOT retry
// ─────────────────────────────────────────
async function test4xxTerminal() {
  console.log('TEST 2: 4xx: terminal, should not retry');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { id } = await submitJob(`${MOCK_URL}/not-found`, 'GET', {
    maxRetries: 5,
    backoffMs: 1000,
  });

  console.log(`Submitted job: ${id}`);
  console.log('Waiting for job to finish...\n');

  const result = await pollUntilDone(id);

  console.log('\n');
  console.log(`Final status:   ${result.status}`);
  console.log(`Total attempts: ${result.attemptCount}`);
  console.log(`Last error:     ${result.lastError}`);
  console.log('\nAttempt history (should be only 1 attempt):');
  printAttempts(result.attempts);

  // Assert it failed immediately with only 1 attempt
  if (result.status === 'failed' && result.attemptCount === 1) {
    console.log('\n✓ PASSED — job failed immediately on 4xx, was not retried');
  } else {
    console.log('\n✗ FAILED — expected 1 attempt and failed status, got:', result.status, 'attempts:', result.attemptCount);
  }
}

// ─────────────────────────────────────────
// TEST 3: Always 500 — should dead-letter
// ─────────────────────────────────────────
async function testDeadLetter() {
  console.log('TEST 3: Always 500. should dead-letter');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Use small backoffMs so the test doesn't take forever
  const { id } = await submitJob(`${MOCK_URL}/always-fail`, 'GET', {
    maxRetries: 3,
    backoffMs: 500,
  });

  console.log(`Submitted job: ${id}`);
  console.log('Waiting for job to dead-letter...\n');

  const result = await pollUntilDone(id, 120000); // give it 2 mins

  console.log('\n');
  console.log(`Final status:   ${result.status}`);
  console.log(`Total attempts: ${result.attemptCount}`);
  console.log(`Last error:     ${result.lastError}`);
  console.log('\nAttempt history:');
  printAttempts(result.attempts);

  // Assert it dead-lettered after maxRetries
  if (result.status === 'failed' && result.attemptCount === 3) {
    console.log('\n✓ PASSED — job dead-lettered after hitting maxRetries');
  } else {
    console.log('\n✗ FAILED — expected 3 attempts and failed status, got:', result.status, 'attempts:', result.attemptCount);
  }
}

// run all tests
async function runAll() {
  console.log('Starting tests...');
  console.log(`  Main server:  ${BASE_URL}`);
  console.log(`  Mock server:  ${MOCK_URL}\n`);

  try {
    await testMockEndpoint();
    await wait(2000); // small gap between tests

    await test4xxTerminal();
    await wait(2000);

    await testDeadLetter();

    console.log('All tests done');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (err) {
    console.error('\nTest runner error:', err.message);
    process.exit(1);
  }
}

runAll();