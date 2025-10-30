const axios = require('axios');

async function testAuth() {
  try {
    console.log('🔐 Testing authentication...');
    
    // First, try to login
    const loginResponse = await axios.post('http://localhost:4001/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('✅ Login successful:', {
      hasToken: !!loginResponse.data.data.token,
      hasUser: !!loginResponse.data.data.user
    });
    
    const token = loginResponse.data.data.token;
    
    // Test certificate API with token
    const certResponse = await axios.post('http://localhost:4001/api/certificates/issue/test-playlist', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Certificate API test successful:', certResponse.data);
    
  } catch (error) {
    console.error('❌ Auth test failed:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      error: error.message
    });
  }
}

testAuth();
