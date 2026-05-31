import express from 'express';
import env from '../src/config/env.js';

const app = express();
const PORT = env.MOCK_SERVER_PORT || 4000;

app.use(express.json());

// Track how many times each endpoint has been called
const callCounts = {};

// Endpoint 1: fails 3 times then succeeds
// ─────────────────────────────────────────
app.all('/mock', (req, res) => {
  const key = 'mock';
  callCounts[key] = (callCounts[key] || 0) + 1;
  const count = callCounts[key];

  console.log(`[Mock] /mock called — attempt #${count}`);

  if (count <= 3) {
    // Fail the first 3 times
    console.log(`[Mock] Returning 500 (attempt ${count} of 3 failures)`);
    return res.status(500).json({ error: 'Internal Server Error', attempt: count });
  }

  // Succeed on the 4th call
  console.log(`[Mock] Returning 200 — success on attempt #${count}`);
  return res.status(200).json({ message: 'Finally succeeded!', attempt: count });
});

// Endpoint 2: always returns 404 (terminal)
// ─────────────────────────────────────────
app.all('/not-found', (req, res) => {
  console.log(`[Mock] /not-found called — returning 404`);
  return res.status(404).json({ error: 'Not Found' });
});

// Endpoint 3: always returns 500 (dead-letter)
// ─────────────────────────────────────────
app.all('/always-fail', (req, res) => {
  const key = 'always-fail';
  callCounts[key] = (callCounts[key] || 0) + 1;

  console.log(`[Mock] /always-fail called — attempt #${callCounts[key]}, returning 500`);
  return res.status(500).json({ error: 'Always fails' });
});

// Reset call counts between test runs
// ─────────────────────────────────────────
app.post('/reset', (req, res) => {
  Object.keys(callCounts).forEach(k => delete callCounts[k]);
  console.log('[Mock] Call counts reset');
  return res.status(200).json({ message: 'Reset done' });
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});