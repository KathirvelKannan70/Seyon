import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('--------------------------------------------------');
  console.log('Running API Integration Tests...');
  console.log('--------------------------------------------------');

  try {
    // 1. Health check
    console.log('Testing Health Check Endpoint...');
    const healthRes = await fetch('http://localhost:5000/');
    const healthData = await healthRes.json();
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthData.status, 'healthy');
    console.log('✓ Health check passed.');

    // 2. Authentication Login
    console.log('\nTesting Admin Login Endpoint...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@seyon.com',
        password: 'admin123',
      }),
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginData.success, true);
    assert.ok(loginData.accessToken);
    const token = loginData.accessToken;
    console.log('✓ Admin login passed. Token generated.');

    // 3. Dashboard Statistics
    console.log('\nTesting Dashboard Analytics Endpoint...');
    const statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const statsData = await statsRes.json();
    assert.strictEqual(statsRes.status, 200);
    assert.strictEqual(statsData.success, true);
    assert.ok(statsData.data.summary);
    assert.ok(Array.isArray(statsData.data.collectionGraph));
    console.log('✓ Dashboard statistics aggregated correctly.');

    // 4. Collections today
    console.log('\nTesting Today\'s scheduled collections desk...');
    const colRes = await fetch(`${BASE_URL}/collections/today?day=Friday`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const colData = await colRes.json();
    assert.strictEqual(colRes.status, 200);
    assert.strictEqual(colData.success, true);
    assert.ok(Array.isArray(colData.data));
    console.log('✓ Scheduled weekday collections loaded correctly.');

    console.log('\n--------------------------------------------------');
    console.log('ALL API INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('--------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST RUN ENCOUNTERED AN ERROR:');
    console.error(error.message);
    process.exit(1);
  }
};

runTests();
