/**
 * Manual test/validation script for phone utilities
 * Run this in browser console or Node.js to validate functionality
 */

import {
  normalizeToE164Saudi,
  isValidSaudiMobile,
  formatPhoneForDisplay,
  getWhatsAppLink,
  normalizePhoneWithDetails
} from '../phone';

// Test data
const testCases = [
  // Valid cases
  { input: '+966501234567', expected: '+966501234567', description: 'Already normalized E.164' },
  { input: '966501234567', expected: '+966501234567', description: '966 prefix' },
  { input: '00966501234567', expected: '+966501234567', description: 'International dialing' },
  { input: '0501234567', expected: '+966501234567', description: 'Local format' },
  { input: '05 0123 4567', expected: '+966501234567', description: 'Local with spaces' },
  { input: '050-123-4567', expected: '+966501234567', description: 'Local with dashes' },

  // Invalid cases
  { input: null, expected: null, description: 'Null input' },
  { input: '', expected: null, description: 'Empty string' },
  { input: '   ', expected: null, description: 'Whitespace only' },
  { input: '+96650123456', expected: null, description: 'Too short E.164' },
  { input: '+9665012345678', expected: null, description: 'Too long E.164' },
  { input: '050123456', expected: null, description: 'Too short local' },
  { input: '05012345678', expected: null, description: 'Too long local' },
  { input: '0111234567', expected: null, description: 'Landline number' },
  { input: '123456789', expected: null, description: 'Invalid format' },
];

/**
 * Validates phone normalization function
 */
export function validatePhoneNormalization(): { passed: number; failed: number; results: any[] } {
  const results: any[] = [];
  let passed = 0;
  let failed = 0;

  console.log('🧪 Testing Phone Normalization...');

  for (const testCase of testCases) {
    const result = normalizeToE164Saudi(testCase.input);
    const success = result === testCase.expected;

    if (success) {
      passed++;
      console.log(`✅ ${testCase.description}: "${testCase.input}" → "${result}"`);
    } else {
      failed++;
      console.log(`❌ ${testCase.description}: "${testCase.input}" → "${result}" (expected "${testCase.expected}")`);
    }

    results.push({
      ...testCase,
      actual: result,
      success
    });
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}

/**
 * Validates WhatsApp link generation
 */
export function validateWhatsAppLinks(): { passed: number; failed: number } {
  const whatsappTests = [
    { input: '+966501234567', expected: 'https://wa.me/966501234567' },
    { input: '+966501234567', text: 'Hello', expected: 'https://wa.me/966501234567?text=Hello' },
    { input: '0501234567', expected: 'https://wa.me/966501234567' },
    { input: 'invalid', expected: null },
    { input: null, expected: null },
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Testing WhatsApp Link Generation...');

  for (const test of whatsappTests) {
    const result = getWhatsAppLink(test.input, test.text);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ WhatsApp link: "${test.input}"${test.text ? ` with text "${test.text}"` : ''} → "${result}"`);
    } else {
      failed++;
      console.log(`❌ WhatsApp link: "${test.input}" → "${result}" (expected "${test.expected}")`);
    }
  }

  console.log(`\n📊 WhatsApp Results: ${passed} passed, ${failed} failed`);

  return { passed, failed };
}

/**
 * Validates display formatting
 */
export function validateDisplayFormatting(): { passed: number; failed: number } {
  const displayTests = [
    { input: '+966501234567', expected: '0501234567' },
    { input: '+96650123456', expected: '+96650123456' }, // Invalid format
    { input: '0501234567', expected: '0501234567' },
    { input: null, expected: '' },
    { input: '', expected: '' },
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Testing Display Formatting...');

  for (const test of displayTests) {
    const result = formatPhoneForDisplay(test.input);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ Display format: "${test.input}" → "${result}"`);
    } else {
      failed++;
      console.log(`❌ Display format: "${test.input}" → "${result}" (expected "${test.expected}")`);
    }
  }

  console.log(`\n📊 Display Results: ${passed} passed, ${failed} failed`);

  return { passed, failed };
}

/**
 * Validates mobile number validation
 */
export function validateMobileValidation(): { passed: number; failed: number } {
  const validationTests = [
    { input: '+966501234567', expected: true },
    { input: '0501234567', expected: true },
    { input: '966501234567', expected: true },
    { input: '+96650123456', expected: false }, // Too short
    { input: '050123456', expected: false }, // Too short
    { input: null, expected: false },
    { input: '', expected: false },
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Testing Mobile Validation...');

  for (const test of validationTests) {
    const result = isValidSaudiMobile(test.input);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ Mobile validation: "${test.input}" → ${result}`);
    } else {
      failed++;
      console.log(`❌ Mobile validation: "${test.input}" → ${result} (expected ${test.expected})`);
    }
  }

  console.log(`\n📊 Validation Results: ${passed} passed, ${failed} failed`);

  return { passed, failed };
}

/**
 * Runs all phone utility tests
 */
export function runAllPhoneTests(): void {
  console.log('🚀 Running Phone Utility Tests...\n');

  const normalization = validatePhoneNormalization();
  const whatsapp = validateWhatsAppLinks();
  const display = validateDisplayFormatting();
  const validation = validateMobileValidation();

  const totalPassed = normalization.passed + whatsapp.passed + display.passed + validation.passed;
  const totalFailed = normalization.failed + whatsapp.failed + display.failed + validation.failed;

  console.log('\n🎯 Final Results:');
  console.log(`Total Tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

  if (totalFailed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the results above.');
  }
}

// Auto-run tests if this script is executed directly
if (typeof window !== 'undefined' && window.location) {
  // Browser environment - expose to console
  (window as any).runPhoneTests = runAllPhoneTests;
  console.log('💡 Phone tests loaded! Run runPhoneTests() in console to execute.');
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  runAllPhoneTests();
}