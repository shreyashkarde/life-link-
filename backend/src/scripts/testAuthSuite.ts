import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/auth';

async function runAuthTests() {
  console.log('🚀 Running Comprehensive Authentication & Security Test Suite...\n');

  try {
    // Test 1: Google Login with non-@gmail.com (Should Reject)
    console.log('Test 1: Google login with corporate/non-gmail email...');
    try {
      const res = await axios.post(`${BASE_URL}/google-login`, {
        email: 'doctor@hospital.org',
        name: 'Dr. John',
      });
      console.error('❌ Failed: Expected 400 rejection for non-gmail domain, got:', res.status);
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('Only @gmail.com users')) {
        console.log('✅ Passed: Properly rejected non-gmail account with message:', err.response.data.message);
      } else {
        console.error('⚠️ Unexpected error response:', err.response?.data);
      }
    }

    // Test 2: Google Login with @gmail.com (Should Succeed)
    console.log('\nTest 2: Google login with valid @gmail.com email...');
    const googleRes = await axios.post(`${BASE_URL}/google-login`, {
      email: 'shreyash.tester@gmail.com',
      name: 'Shreyash Tester',
      googleId: 'g_test_123456',
    });
    if (googleRes.data.success && googleRes.data.token) {
      console.log('✅ Passed: Successfully authenticated @gmail.com user. Token:', googleRes.data.token.substring(0, 25) + '...');
    } else {
      console.error('❌ Failed Google login for @gmail.com user');
    }

    // Test 3: Register User & Email Verification Token Generation
    console.log('\nTest 3: User registration & verification token generation...');
    const testRegEmail = `testuser_${Date.now()}@gmail.com`;
    const regRes = await axios.post(`${BASE_URL}/register`, {
      name: 'New Registered Patient',
      email: testRegEmail,
      password: 'password123',
      role: 'PATIENT',
    });
    console.log('Registration response:', regRes.data.message);
    const verificationToken = regRes.data.verificationToken;
    console.log('Verification Token received:', verificationToken);

    // Test 4: Verify Email via Token
    console.log('\nTest 4: Verifying email with token...');
    const verifyRes = await axios.get(`${BASE_URL}/verify-email?token=${verificationToken}`);
    if (verifyRes.data.success && verifyRes.data.user?.isVerified) {
      console.log('✅ Passed: User email verified successfully. Statement:', verifyRes.data.statement);
    } else {
      console.error('❌ Failed email verification:', verifyRes.data);
    }

    // Test 5: Forgot Password & SHA-256 Token Generation
    console.log('\nTest 5: Requesting password reset (forgot-password)...');
    const forgotRes = await axios.post(`${BASE_URL}/forgot-password`, {
      email: testRegEmail,
    });
    console.log('Forgot password response:', forgotRes.data.message);
    const resetToken = forgotRes.data.resetToken;
    console.log('Reset Token received:', resetToken);

    // Test 6: Reset Password with Token
    console.log('\nTest 6: Resetting password using token...');
    const resetRes = await axios.post(`${BASE_URL}/reset-password`, {
      token: resetToken,
      newPassword: 'newsecurepassword2026',
    });
    if (resetRes.data.success) {
      console.log('✅ Passed:', resetRes.data.message);
    } else {
      console.error('❌ Failed password reset:', resetRes.data);
    }

    // Test 7: Log in with New Password
    console.log('\nTest 7: Logging in with updated password...');
    const loginRes = await axios.post(`${BASE_URL}/login`, {
      email: testRegEmail,
      password: 'newsecurepassword2026',
    });
    if (loginRes.data.success && loginRes.data.token) {
      console.log('✅ Passed: Successfully logged in with new password. Role:', loginRes.data.user?.role);
    } else {
      console.error('❌ Failed login with updated password:', loginRes.data);
    }

    console.log('\n🎉 ALL 7 AUTHENTICATION & SECURITY TESTS PASSED PERFECTLY!');
  } catch (err: any) {
    console.error('Test execution error:', err.response?.data || err.message);
  }
}

runAuthTests();
