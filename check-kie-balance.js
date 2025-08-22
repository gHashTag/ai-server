const axios = require('axios');

const KIE_API_KEY = 'f52f224a92970aa6b7c7780104a00f71';
const BASE_URL = 'https://api.kie.ai/api/v1';

async function checkKieBalance() {
  console.log('🔍 Checking Kie.ai account status...\n');
  
  try {
    // Check balance/credits
    const creditResponse = await axios.get(`${BASE_URL}/chat/credit`, {
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('💰 Account Status:');
    console.log(JSON.stringify(creditResponse.data, null, 2));
    
    // Try to get more account info
    const headers = {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json'
    };
    
    // Test minimal generation
    console.log('\n🎬 Testing minimal video generation (2 seconds)...');
    const testRequest = {
      model: 'veo3_fast',
      prompt: 'Simple test',
      duration: 2,
      aspectRatio: '16:9'
    };
    
    try {
      const response = await axios.post(`${BASE_URL}/veo/generate`, testRequest, {
        headers,
        timeout: 30000
      });
      
      console.log('✅ Generation successful!');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.data && response.data.data.taskId) {
        console.log(`\n📋 Task ID: ${response.data.data.taskId}`);
        
        // Wait and check status
        console.log('⏳ Waiting 10 seconds to check status...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        try {
          const statusUrl = `${BASE_URL}/task/status/${response.data.data.taskId}`;
          const statusResponse = await axios.get(statusUrl, { headers });
          console.log('\n📊 Task Status:');
          console.log(JSON.stringify(statusResponse.data, null, 2));
        } catch (statusError) {
          console.log('⚠️ Could not get task status (may be processing)');
        }
      }
      
    } catch (genError) {
      console.error('❌ Generation failed:', genError.message);
      if (genError.response) {
        console.error('Response:', JSON.stringify(genError.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to check account:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkKieBalance().catch(console.error);
