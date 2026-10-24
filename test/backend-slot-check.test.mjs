import assert from 'node:assert';

const PORT = 3088;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('🧪 Starting backend slot free checking test suite...');

  // 1. Check Initial Availability for Tomorrow 10:00 to 11:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const slotStart = `${dateStr}T10:00:00.000Z`;
  const slotEnd = `${dateStr}T11:00:00.000Z`;

  console.log('\n👉 Test 1: Check availability for empty slot on backend...');
  const checkRes1 = await fetch(`${BASE_URL}/api/check-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facilityId: 'kitchen',
      startTime: slotStart,
      endTime: slotEnd,
    }),
  });
  const checkData1 = await checkRes1.json();
  assert.strictEqual(checkRes1.status, 200);
  assert.strictEqual(checkData1.isAvailable, true, 'Slot should be available initially');
  console.log('✅ Passed: Slot is verified free by backend.');

  // 2. Book the slot
  console.log('\n👉 Test 2: Book the kitchen slot for Student A...');
  const bookRes1 = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'kitchen',
      student_name: 'Ananya Roy',
      student_roll: '23CS101',
      student_room: 'Room A-202',
      student_phone: '+91 99887 76655',
      purpose: 'Baking a cake',
      attendees_count: 2,
      start_time: slotStart,
      end_time: slotEnd,
    }),
  });
  const bookData1 = await bookRes1.json();
  assert.strictEqual(bookRes1.status, 201);
  assert.ok(bookData1.booking.booking_code.startsWith('KIT-'));
  const bookingA = bookData1.booking;
  console.log(`✅ Passed: Booking created with code ${bookingA.booking_code}`);

  // 3. Backend Slot Free Checking: Try to check overlapping slot
  console.log('\n👉 Test 3: Backend availability check for overlapping slot (10:30 to 11:30)...');
  const overlapStart = `${dateStr}T10:30:00.000Z`;
  const overlapEnd = `${dateStr}T11:30:00.000Z`;

  const checkRes2 = await fetch(`${BASE_URL}/api/check-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facilityId: 'kitchen',
      startTime: overlapStart,
      endTime: overlapEnd,
    }),
  });
  const checkData2 = await checkRes2.json();
  assert.strictEqual(checkRes2.status, 200);
  assert.strictEqual(checkData2.isAvailable, false, 'Backend must flag overlapping slot as unavailable');
  assert.ok(checkData2.conflicts.length > 0, 'Conflicting booking must be returned');
  console.log('✅ Passed: Backend correctly detected overlap conflict.');

  // 4. Double Booking Attempt: Backend must REJECT simultaneous/conflicting booking
  console.log('\n👉 Test 4: Attempt to double-book overlapping slot on backend...');
  const bookRes2 = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'kitchen',
      student_name: 'Vikram Singh',
      student_roll: '23ME044',
      student_room: 'Room A-301',
      student_phone: '+91 91234 56789',
      purpose: 'Making soup',
      attendees_count: 1,
      start_time: overlapStart,
      end_time: overlapEnd,
    }),
  });
  const bookData2 = await bookRes2.json();
  assert.strictEqual(bookRes2.status, 409, 'Backend must return 409 Conflict status');
  assert.ok(
    bookData2.error.includes('already booked') || bookData2.error.includes('overlaps'),
    'Backend must return descriptive conflict error'
  );
  console.log('✅ Passed: Backend successfully blocked double booking (409 Conflict).');

  // 5. Exceeding Max Duration check
  console.log('\n👉 Test 5: Verify max duration constraint on backend...');
  const longStart = `${dateStr}T12:00:00.000Z`;
  const longEnd = `${dateStr}T18:00:00.000Z`; // 6 hours (max is 3)
  const bookRes3 = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'kitchen',
      student_name: 'Test Student',
      student_roll: '23CS999',
      student_room: 'Room A-101',
      student_phone: '+91 90000 00000',
      purpose: 'Marathon cook',
      start_time: longStart,
      end_time: longEnd,
    }),
  });
  const bookData3 = await bookRes3.json();
  assert.strictEqual(bookRes3.status, 400);
  assert.ok(bookData3.error.includes('Maximum booking duration'));
  console.log('✅ Passed: Backend rejected booking exceeding 3 hours limit.');

  // 6. Representative Key Handover flow
  console.log('\n👉 Test 6: Representative records key handover to student...');
  const handoverRes = await fetch(`${BASE_URL}/api/bookings/${bookingA.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key_status: 'collected' }),
  });
  const handoverData = await handoverRes.json();
  assert.strictEqual(handoverRes.status, 200);
  assert.strictEqual(handoverData.booking.key_status, 'collected');
  assert.ok(handoverData.booking.key_collected_at);
  console.log('✅ Passed: Key status updated to "collected" with timestamp.');

  // 7. Representative Key Return flow
  console.log('\n👉 Test 7: Representative records key returned by student...');
  const returnRes = await fetch(`${BASE_URL}/api/bookings/${bookingA.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key_status: 'returned' }),
  });
  const returnData = await returnRes.json();
  assert.strictEqual(returnRes.status, 200);
  assert.strictEqual(returnData.booking.key_status, 'returned');
  assert.ok(returnData.booking.key_returned_at);
  console.log('✅ Passed: Key status updated to "returned" with timestamp.');

  // 8. Cancellation frees up slot
  console.log('\n👉 Test 8: Student cancels booking, slot becomes free again...');
  const cancelRes = await fetch(`${BASE_URL}/api/bookings/${bookingA.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  assert.strictEqual(cancelRes.status, 200);

  const checkRes3 = await fetch(`${BASE_URL}/api/check-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facilityId: 'kitchen',
      startTime: slotStart,
      endTime: slotEnd,
    }),
  });
  const checkData3 = await checkRes3.json();
  assert.strictEqual(checkData3.isAvailable, true, 'Slot should be freed after cancellation');
  console.log('✅ Passed: Slot is verified free again after cancellation.');

  console.log('\n🎉 ALL 8 BACKEND TEST SCENARIOS PASSED WITH ZERO ERRORS!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
