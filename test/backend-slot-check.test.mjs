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
  // Clean up any existing test bookings for tomorrow if any
  const m = String(Math.floor(Math.random() * 11) + 1).padStart(2, '0');
  const d = String(Math.floor(Math.random() * 25) + 1).padStart(2, '0');
  const dateStr = `2027-${m}-${d}`;
  console.log(`Using unique test date: ${dateStr}`);

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

  try {
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
    assert.strictEqual(new Date(changeData.booking.start_time).getTime(), new Date(`${dateStr}T20:00:00.000Z`).getTime());
    console.log('✅ Passed: Admin successfully changed slot timings on backend.');

    // 9. Background check-availability API & Double Booking Prevention across different roll numbers / emails
    console.log('\n👉 Test 9: Background check-availability API & Double Booking Prevention across different emails...');
    const checkBusyRes = await fetch(`${BASE_URL}/api/check-availability?facility_id=tv-room&start_time=${dateStr}T20:00:00.000Z&end_time=${dateStr}T22:00:00.000Z`);
    const checkBusyData = await checkBusyRes.json();
    assert.strictEqual(checkBusyRes.status, 200);
    assert.strictEqual(checkBusyData.isAvailable, false, 'Slot must be reported as NOT available');
    assert.strictEqual(checkBusyData.conflicts?.[0]?.roll_number, 'CS21B101');
    console.log(`✅ Passed: Background check accurately identifies slot as busy (${checkBusyData.reason}).`);

    const checkFreeRes = await fetch(`${BASE_URL}/api/check-availability?facility_id=tv-room&start_time=${dateStr}T14:00:00.000Z&end_time=${dateStr}T16:00:00.000Z`);
    const checkFreeData = await checkFreeRes.json();
    assert.strictEqual(checkFreeRes.status, 200);
    assert.strictEqual(checkFreeData.isAvailable, true, 'Slot must be reported as free');
    console.log('✅ Passed: Background check accurately identifies free slot.');

    // Attempt double booking with DIFFERENT student roll number (e.g. CS22B202) for the 20:00 - 22:00 slot
    console.log('\n👉 Test 10: Different student (CS22B202) tries to book overlapping slot (20:00 - 22:00)...');
    const conflictBookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facility_id: 'tv-room',
        roll_number: 'CS22B202',
        attendees_count: 2,
        start_time: `${dateStr}T21:00:00.000Z`,
        end_time: `${dateStr}T22:00:00.000Z`,
        purpose: 'Gaming',
      }),
    });
    assert.ok(conflictBookRes.status === 409 || conflictBookRes.status === 400, `Expected 409 Conflict or 400 Bad Request, got ${conflictBookRes.status}`);
    const conflictData = await conflictBookRes.json();
    console.log('Conflict response received from backend:', conflictData);
    assert.ok(conflictData.error.toLowerCase().includes('already booked') || conflictData.error.toLowerCase().includes('conflict') || conflictData.error.toLowerCase().includes('occupied'), 'Error must indicate conflict');
    console.log(`✅ Passed: Conflicting booking correctly rejected by backend (${conflictData.error}).`);
  } finally {
    // 11. Admin removes slot
    console.log('\n👉 Test 11: Admin removes the slot...');
    const delRes = await fetch(`${BASE_URL}/api/admin/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: { 'x-admin-roll': ADMIN_ROLL },
    });
    assert.strictEqual(delRes.status, 200);
    console.log('✅ Passed: Admin successfully removed slot.');
  }

  console.log('\n🎉 ALL ADMIN & POLICY TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
