/**
 * Manual test/validation script for communication utilities
 * Run this in browser console or Node.js to validate functionality
 */

import {
  canSendEmail,
  canSendWhatsApp,
  whatsAppLink,
  getPrimaryContactMethod,
  getAvailableContactMethods,
  getPrimaryContactLink,
  getCustomerDisplayName,
  getCustomerContactSummary
} from '../communication';

import type { Customer } from '../../components/CustomerColumns';

// Test data
const testCustomers: Customer[] = [
  {
    id: '1',
    name: 'John Doe',
    customer_type: 'residential',
    phone: '+966501234567',
    email: 'john@example.com',
    address: '123 Main St, Riyadh',
    short_address: '123 Main St',
    city: 'Riyadh',
    state: 'Riyadh Province',
    zip_code: '12345',
    is_active: true,
    first_name: 'John',
    last_name: 'Doe',
    phone_mobile: '+966501234567',
    email_enabled: true,
    whatsapp_enabled: true,
    preferred_contact: 'mobile'
  },
  {
    id: '2',
    name: 'ABC Company',
    customer_type: 'commercial',
    phone: '+966501234568',
    email: 'contact@abc.com',
    address: '456 Business Ave, Jeddah',
    short_address: '456 Business Ave',
    city: 'Jeddah',
    state: 'Makkah Province',
    zip_code: '23456',
    is_active: true,
    company_name: 'ABC Company',
    phone_mobile: '+966501234568',
    email_enabled: false,
    whatsapp_enabled: true,
    preferred_contact: 'whatsapp'
  },
  {
    id: '3',
    name: 'Jane Smith',
    customer_type: 'residential',
    phone: '+966501234569',
    email: 'jane@example.com',
    address: '789 Residential St, Dammam',
    short_address: '789 Residential St',
    city: 'Dammam',
    state: 'Eastern Province',
    zip_code: '34567',
    is_active: true,
    first_name: 'Jane',
    last_name: 'Smith',
    email_enabled: true,
    whatsapp_enabled: false,
    preferred_contact: 'email'
  },
  {
    id: '4',
    name: 'No Contact Company',
    customer_type: 'commercial',
    phone: null,
    email: null,
    address: '999 No Contact St, Mecca',
    short_address: '999 No Contact St',
    city: 'Mecca',
    state: 'Makkah Province',
    zip_code: '45678',
    is_active: true,
    company_name: 'No Contact Company',
    email_enabled: false,
    whatsapp_enabled: false
  }
];

/**
 * Tests email communication availability
 */
export function testEmailCommunication(): { passed: number; failed: number } {
  const emailTests = [
    { customer: testCustomers[0], expected: true, description: 'Email enabled with address' },
    { customer: testCustomers[1], expected: false, description: 'Email disabled' },
    { customer: testCustomers[2], expected: true, description: 'Email enabled with address' },
    { customer: testCustomers[3], expected: false, description: 'No email address' },
  ];

  let passed = 0;
  let failed = 0;

  console.log('🧪 Testing Email Communication...');

  for (const test of emailTests) {
    const result = canSendEmail(test.customer);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ ${test.description}: ${result}`);
    } else {
      failed++;
      console.log(`❌ ${test.description}: ${result} (expected ${test.expected})`);
    }
  }

  console.log(`\n📊 Email Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

/**
 * Tests WhatsApp communication availability
 */
export function testWhatsAppCommunication(): { passed: number; failed: number } {
  const whatsappTests = [
    { customer: testCustomers[0], expected: true, description: 'WhatsApp enabled with mobile' },
    { customer: testCustomers[1], expected: true, description: 'WhatsApp enabled with mobile' },
    { customer: testCustomers[2], expected: false, description: 'WhatsApp disabled' },
    { customer: testCustomers[3], expected: false, description: 'No mobile number' },
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Testing WhatsApp Communication...');

  for (const test of whatsappTests) {
    const result = canSendWhatsApp(test.customer);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ ${test.description}: ${result}`);
    } else {
      failed++;
      console.log(`❌ ${test.description}: ${result} (expected ${test.expected})`);
    }
  }

  console.log(`\n📊 WhatsApp Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

/**
 * Tests WhatsApp link generation
 */
export function testWhatsAppLinks(): { passed: number; failed: number } {
  const linkTests = [
    { customer: testCustomers[0], expected: 'https://wa.me/966501234567', description: 'Valid mobile number' },
    { customer: testCustomers[1], expected: 'https://wa.me/966501234568', description: 'Valid mobile number' },
    { customer: testCustomers[2], expected: null, description: 'WhatsApp disabled' },
    { customer: testCustomers[3], expected: null, description: 'No mobile number' },
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Testing WhatsApp Link Generation...');

  for (const test of linkTests) {
    const result = whatsAppLink(test.customer);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ ${test.description}: "${result}"`);
    } else {
      failed++;
      console.log(`❌ ${test.description}: "${result}" (expected "${test.expected}")`);
    }
  }

  console.log(`\n📊 WhatsApp Link Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

/**
 * Tests primary contact method detection
 */
export function testPrimaryContactMethod(): { passed: number; failed: number } {
  const methodTests = [
    { customer: testCustomers[0], expected: 'mobile', description: 'Preferred mobile' },
    { customer: testCustomers[1], expected: 'whatsapp', description: 'Preferred WhatsApp' },
    { customer: testCustomers[2], expected: 'email', description: 'Preferred email' },
    { customer: testCustomers[3], expected: null, description: 'No available methods' },
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Testing Primary Contact Method...');

  for (const test of methodTests) {
    const result = getPrimaryContactMethod(test.customer);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ ${test.description}: "${result}"`);
    } else {
      failed++;
      console.log(`❌ ${test.description}: "${result}" (expected "${test.expected}")`);
    }
  }

  console.log(`\n📊 Primary Method Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

/**
 * Tests available contact methods
 */
export function testAvailableContactMethods(): { passed: number; failed: number } {
  const availableTests = [
    { customer: testCustomers[0], expected: ['email', 'mobile', 'whatsapp'], description: 'All methods available' },
    { customer: testCustomers[1], expected: ['mobile', 'whatsapp'], description: 'Mobile and WhatsApp only' },
    { customer: testCustomers[2], expected: ['email'], description: 'Email only' },
    { customer: testCustomers[3], expected: [], description: 'No methods available' },
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Testing Available Contact Methods...');

  for (const test of availableTests) {
    const result = getAvailableContactMethods(test.customer);
    const success = JSON.stringify(result.sort()) === JSON.stringify(test.expected.sort());

    if (success) {
      passed++;
      console.log(`✅ ${test.description}: [${result.join(', ')}]`);
    } else {
      failed++;
      console.log(`❌ ${test.description}: [${result.join(', ')}] (expected [${test.expected.join(', ')}])`);
    }
  }

  console.log(`\n📊 Available Methods Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

/**
 * Tests customer display name generation
 */
export function testDisplayNames(): { passed: number; failed: number } {
  const nameTests = [
    { customer: testCustomers[0], expected: 'John Doe', description: 'Person with first/last name' },
    { customer: testCustomers[1], expected: 'ABC Company', description: 'Company name' },
    { customer: testCustomers[2], expected: 'Jane Smith', description: 'Person with first/last name' },
    { customer: testCustomers[3], expected: 'No Contact Company', description: 'Company name fallback' },
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Testing Customer Display Names...');

  for (const test of nameTests) {
    const result = getCustomerDisplayName(test.customer);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ ${test.description}: "${result}"`);
    } else {
      failed++;
      console.log(`❌ ${test.description}: "${result}" (expected "${test.expected}")`);
    }
  }

  console.log(`\n📊 Display Name Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

/**
 * Tests primary contact link generation
 */
export function testPrimaryContactLinks(): { passed: number; failed: number } {
  const linkTests = [
    { customer: testCustomers[0], expected: 'tel:+966501234567', description: 'Mobile preferred' },
    { customer: testCustomers[1], expected: 'https://wa.me/966501234568', description: 'WhatsApp preferred' },
    { customer: testCustomers[2], expected: 'mailto:jane@example.com', description: 'Email preferred' },
    { customer: testCustomers[3], expected: null, description: 'No available methods' },
  ];

  let passed = 0;
  let failed = 0;

  console.log('\n🧪 Testing Primary Contact Links...');

  for (const test of linkTests) {
    const result = getPrimaryContactLink(test.customer);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ ${test.description}: "${result}"`);
    } else {
      failed++;
      console.log(`❌ ${test.description}: "${result}" (expected "${test.expected}")`);
    }
  }

  console.log(`\n📊 Contact Link Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

/**
 * Runs all communication utility tests
 */
export function runAllCommunicationTests(): void {
  console.log('🚀 Running Communication Utility Tests...\n');

  const email = testEmailCommunication();
  const whatsapp = testWhatsAppCommunication();
  const whatsappLinks = testWhatsAppLinks();
  const primaryMethod = testPrimaryContactMethod();
  const availableMethods = testAvailableContactMethods();
  const displayNames = testDisplayNames();
  const contactLinks = testPrimaryContactLinks();

  const totalPassed = email.passed + whatsapp.passed + whatsappLinks.passed +
                     primaryMethod.passed + availableMethods.passed +
                     displayNames.passed + contactLinks.passed;
  const totalFailed = email.failed + whatsapp.failed + whatsappLinks.failed +
                     primaryMethod.failed + availableMethods.failed +
                     displayNames.failed + contactLinks.failed;

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
  (window as any).runCommunicationTests = runAllCommunicationTests;
  console.log('💡 Communication tests loaded! Run runCommunicationTests() in console to execute.');
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  runAllCommunicationTests();
}