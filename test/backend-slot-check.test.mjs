import assert from 'node:assert';

const PORT = 3090;
const BASE_URL = `http://localhost:${PORT}`;
const ADMIN_ROLL = 'CS25B1058';

async function runTests() {
  console.log('🧪 Running Ganga Amenities Backend Test Suite (Admin & Policies)...');

  // 1. Admin login with CS25B1058
  console.log('\n👉 Test 1: Admin roll number (CS25B1058) OTP dispatch & verification...');
  const adminOtpRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber: ADMIN_ROLL }),
  });
  const adminOtpData = await adminOtpRes.json();
  assert.strictEqual(adminOtpRes.status, 200);
  assert.strictEqual(adminOtpData.email, 'cs25b1058@nitpy.ac.in');
  assert.ok(adminOtpData.devOtp);

  const adminVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber: ADMIN_ROLL, code: adminOtpData.devOtp }),
  });
  assert.strictEqual(adminVerifyRes.status, 200);
  console.log(`✅ Passed: Admin ${ADMIN_ROLL} logged in.`);

  // 2. Non-admin access to admin APIs blocked
  console.log('\n👉 Test 2: Verify non-admin roll numbers are blocked from admin APIs (403)...');
  const forbiddenRes = await fetch(`${BASE_URL}/api/admin/blacklist`, {
    headers: { 'x-admin-roll': 'CS21B101' },
  });
  assert.strictEqual(forbiddenRes.status, 403, 'Non-admin must receive 403 Forbidden');
  console.log('✅ Passed: Non-admin roll blocked from admin endpoints.');

  // 3. Admin blacklists roll number
  console.log('\n👉 Test 3: Admin blacklists student roll EC22B005...');
  const addBlRes = await fetch(`${BASE_URL}/api/admin/blacklist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-roll': ADMIN_ROLL,
    },
    body: JSON.stringify({ roll_number: 'EC22B005', reason: 'Disciplinary violation' }),
  });
  assert.strictEqual(addBlRes.status, 200);

  // 4. Blacklisted student tries to book -> Backend rejects
  console.log('\n👉 Test 4: Blacklisted student (EC22B005) tries to book -> Backend blocks...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const blBookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'kitchen',
      roll_number: 'EC22B005',
      attendees_count: 2,
      start_time: `${dateStr}T10:00:00.000Z`,
      end_time: `${dateStr}T12:00:00.000Z`,
    }),
  });
  assert.strictEqual(blBookRes.status, 400);
  const blBookData = await blBookRes.json();
  assert.ok(blBookData.error.includes('blacklisted'), 'Backend must return blacklist error');
  console.log('✅ Passed: Blacklist strictly enforced on backend.');

  // 5. Admin applies cooldown
  console.log('\n👉 Test 5: Admin applies 24h cooldown to ME23B042...');
  const cdRes = await fetch(`${BASE_URL}/api/admin/cooldown`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-roll': ADMIN_ROLL,
    },
    body: JSON.stringify({ roll_number: 'ME23B042', hours: 24, reason: 'Missed reservation' }),
  });
  assert.strictEqual(cdRes.status, 200);

  // 6. Cooldown student tries to book -> Backend blocks
  console.log('\n👉 Test 6: Cooldown student (ME23B042) tries to book -> Backend blocks...');
  const cdBookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'kitchen',
      roll_number: 'ME23B042',
      attendees_count: 1,
      start_time: `${dateStr}T10:00:00.000Z`,
      end_time: `${dateStr}T11:00:00.000Z`,
    }),
  });
  assert.strictEqual(cdBookRes.status, 400);
  const cdBookData = await cdBookRes.json();
  assert.ok(cdBookData.error.includes('cooldown'), 'Backend must return cooldown error');
  console.log('✅ Passed: Cooldown strictly enforced on backend.');

  // 7. Normal booking created by CS21B101
  console.log('\n👉 Test 7: Normal booking created for TV Room by CS21B101...');
  const normalBookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'tv-room',
      roll_number: 'CS21B101',
      attendees_count: 5,
      start_time: `${dateStr}T18:00:00.000Z`,
      end_time: `${dateStr}T20:00:00.000Z`,
      purpose: 'Movie screening',
    }),
  });
  const normalBookData = await normalBookRes.json();
  assert.strictEqual(normalBookRes.status, 201);
  const bookingId = normalBookData.booking.id;
  const bookingCode = normalBookData.booking.booking_code;
  console.log(`✅ Passed: Booking ${bookingCode} created.`);

  // 8. Admin changes slot timings
  console.log('\n👉 Test 8: Admin changes slot timing to 20:00 - 22:00...');
  const changeRes = await fetch(`${BASE_URL}/api/admin/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-roll': ADMIN_ROLL,
    },
    body: JSON.stringify({
      start_time: `${dateStr}T20:00:00.000Z`,
      end_time: `${dateStr}T22:00:00.000Z`,
    }),
  });
  const changeData = await changeRes.json();
  assert.strictEqual(changeRes.status, 200);
  assert.strictEqual(changeData.booking.start_time, `${dateStr}T20:00:00.000Z`);
  console.log('✅ Passed: Admin successfully changed slot timings on backend.');

  // 9. Admin removes slot
  console.log('\n👉 Test 9: Admin removes the slot...');
  const delRes = await fetch(`${BASE_URL}/api/admin/bookings/${bookingId}`, {
    method: 'DELETE',
    headers: { 'x-admin-roll': ADMIN_ROLL },
  });
  assert.strictEqual(delRes.status, 200);
  console.log('✅ Passed: Admin successfully removed slot.');

  console.log('\n🎉 ALL ADMIN & POLICY TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
