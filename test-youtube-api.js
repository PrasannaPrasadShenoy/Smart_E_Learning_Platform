const axios = require('axios');
require('dotenv').config();

async function testYouTubeAPI() {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  
  console.log('🔍 Testing YouTube API...');
  console.log(`🔑 API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET'}`);
  
  if (!apiKey) {
    console.error('❌ YouTube API key not configured in .env file');
    console.log('Please add YOUTUBE_DATA_API_KEY to your .env file');
    return;
  }

  try {
    // Test with a simple search
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: 'test',
        maxResults: 1,
        key: apiKey
      }
    });

    console.log('✅ YouTube API is working!');
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Results found: ${response.data.items?.length || 0}`);
    
    if (response.data.items?.length > 0) {
      console.log(`📺 First result: ${response.data.items[0].snippet.title}`);
    }

  } catch (error) {
    console.error('❌ YouTube API test failed:');
    console.error(`Status: ${error.response?.status}`);
    console.error(`Message: ${error.response?.statusText}`);
    console.error(`Error: ${error.message}`);
    
    if (error.response?.status === 403) {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if your API key is correct');
      console.log('2. Check if YouTube Data API v3 is enabled in Google Cloud Console');
      console.log('3. Check if you have exceeded your API quota');
    } else if (error.response?.status === 400) {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if your API key format is correct');
      console.log('2. Make sure the API key has proper permissions');
    }
  }
}

testYouTubeAPI();


