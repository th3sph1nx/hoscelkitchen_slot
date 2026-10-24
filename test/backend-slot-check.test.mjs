import assert from 'node:assert';

const PORT = 3089;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('🧪 Running NITPy Hostel Amenities Test Suite (Dark Minimal & OTP)...');

  // 1. Invalid Roll Number check
  console.log('\n👉 Test 1: Validate 8-char alphanumeric roll number...');
  const badRollRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber: 'CS1' }), // only 3 chars
  });
  assert.strictEqual(badRollRes.status, 400);
  console.log('✅ Passed: Invalid roll number rejected.');

  // 2. Request OTP for valid roll number (CS21B101)
  console.log('\n👉 Test 2: Request OTP for CS21B101 (email: cs21b101@nitpy.ac.in)...');
  const otpRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber: 'CS21B101' }),
  });
  const otpData = await otpRes.json();
  assert.strictEqual(otpRes.status, 200);
  assert.strictEqual(otpData.email, 'cs21b101@nitpy.ac.in');
  assert.ok(otpData.devOtp, 'Development OTP returned for verification');
  const validCode = otpData.devOtp;
  console.log(`✅ Passed: OTP sent to ${otpData.email} (Code: ${validCode})`);

  // 3. Verify OTP
  console.log('\n👉 Test 3: Verify with incorrect OTP then correct OTP...');
  const badVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber: 'CS21B101', code: '000000' }),
  });
  assert.strictEqual(badVerifyRes.status, 401);

  const goodVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber: 'CS21B101', code: validCode }),
  });
  const verifyData = await goodVerifyRes.json();
  assert.strictEqual(goodVerifyRes.status, 200);
  assert.strictEqual(verifyData.rollNumber, 'CS21B101');
  console.log('✅ Passed: Student logged in and verified.');

  // 4. Check initial live status
  console.log('\n👉 Test 4: Check current facility status...');
  const statusRes = await fetch(`${BASE_URL}/api/status`);
  const statusData = await statusRes.json();
  assert.strictEqual(statusRes.status, 200);
  assert.ok('kitchen' in statusData.status);
  assert.ok('tvRoom' in statusData.status);
  console.log('✅ Passed: Live status retrieved.');

  // 5. Book kitchen slot (2 consecutive hours, 4 people)
  console.log('\n👉 Test 5: Book Kitchen slot for 2 consecutive hours (18:00 - 20:00)...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const startISO = `${dateStr}T18:00:00.000Z`;
  const endISO = `${dateStr}T20:00:00.000Z`;

  const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'kitchen',
      roll_number: 'CS21B101',
      attendees_count: 4,
      start_time: startISO,
      end_time: endISO,
      purpose: 'Dinner prep with roomies',
    }),
  });
  const bookData = await bookRes.json();
  assert.strictEqual(bookRes.status, 201);
  assert.ok(bookData.booking.booking_code.startsWith('KIT-'));
  const bookingCode = bookData.booking.booking_code;
  console.log(`✅ Passed: Booking confirmed with code ${bookingCode} for 4 people.`);

  // 6. Backend slot conflict check
  console.log('\n👉 Test 6: Verify backend rejects overlapping slot for another student...');
  const conflictRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'kitchen',
      roll_number: 'EC22B005',
      attendees_count: 2,
      start_time: `${dateStr}T19:00:00.000Z`, // overlaps 18:00 - 20:00
      end_time: `${dateStr}T21:00:00.000Z`,
    }),
  });
  assert.strictEqual(conflictRes.status, 409, 'Backend must return 409 Conflict');
  console.log('✅ Passed: Backend blocked double-booking with 409 Conflict.');

  // 7. Max duration check (> 3 hours)
  console.log('\n👉 Test 7: Verify max duration limit of 3 hours...');
  const longRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'kitchen',
      roll_number: 'CS21B101',
      attendees_count: 1,
      start_time: `${dateStr}T10:00:00.000Z`,
      end_time: `${dateStr}T14:30:00.000Z`, // 4.5 hours
    }),
  });
  assert.strictEqual(longRes.status, 400);
  console.log('✅ Passed: Duration exceeding 3 hours rejected.');

  // 8. Cancellation
  console.log('\n👉 Test 8: Cancel booking...');
  const cancelRes = await fetch(`${BASE_URL}/api/bookings/${bookingCode}?roll_number=CS21B101`, {
    method: 'DELETE',
  });
  assert.strictEqual(cancelRes.status, 200);
  console.log('✅ Passed: Booking cancelled.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
