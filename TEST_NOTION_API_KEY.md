# How to Test Your Notion API Key

If you're getting "Invalid Notion API key" errors, follow these steps to verify your API key is working.

## Step 1: Verify Your Integration is Active

1. Go to https://www.notion.so/my-integrations
2. Sign in to your Notion account
3. Check if your integration is listed
4. If it's **missing** or shows **"Inactive"**:
   - Create a new integration: Click **"+ New integration"**
   - Choose **"Internal"** integration
   - Name it (e.g., "ILA Platform")
   - Copy the new API key (starts with `secret_`)

## Step 2: Test Your API Key Manually

### Option A: Using curl (Command Line)

```bash
curl https://api.notion.com/v1/users/me \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Notion-Version: 2022-06-28"
```

**Replace `YOUR_API_KEY_HERE` with your actual API key.**

**Expected response (success):**
```json
{
  "object": "user",
  "id": "...",
  "name": "Your Name",
  ...
}
```

**If you get an error:**
- `401 Unauthorized` = API key is invalid or integration is inactive
- `404 Not Found` = Wrong endpoint (shouldn't happen)

### Option B: Using Postman or Insomnia

1. Create a new GET request
2. URL: `https://api.notion.com/v1/users/me`
3. Headers:
   - `Authorization`: `Bearer YOUR_API_KEY_HERE`
   - `Notion-Version`: `2022-06-28`
4. Send the request

### Option C: Using Node.js (Quick Test)

Create a file `test-notion.js`:

```javascript
const axios = require('axios');

const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual key

async function testNotionKey() {
  try {
    const response = await axios.get('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Notion-Version': '2022-06-28'
      }
    });
    console.log('✅ API Key is VALID!');
    console.log('User:', response.data.name || response.data.id);
  } catch (error) {
    console.error('❌ API Key is INVALID');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

testNotionKey();
```

Run it:
```bash
node test-notion.js
```

## Step 3: Common Issues and Solutions

### Issue: "401 Unauthorized"

**Possible causes:**
1. **API key is incorrect** - Double-check you copied the entire key
2. **Integration is inactive** - Check https://www.notion.so/my-integrations
3. **API key was regenerated** - If you regenerated the key, use the new one
4. **Extra spaces** - Make sure there are no spaces before/after the key

**Solution:**
- Go to https://www.notion.so/my-integrations
- Click on your integration
- Copy the **Internal Integration Token** again
- Make sure you copy the ENTIRE key (should be 50+ characters)
- Try the test again

### Issue: "Integration not found in Connections list"

**Solution:**
1. Make sure your integration is active at https://www.notion.so/my-integrations
2. If it's not there, create a new one
3. Get the new API key
4. Try connecting again

### Issue: "API key works but database access fails"

This means:
- ✅ Your API key is valid
- ❌ Your database is not shared with the integration

**Solution:**
1. Open your database in Notion
2. Click "..." (three dots) → "Connections"
3. Select your integration
4. Make sure it has "Read" and "Update" capabilities

## Step 4: Get a Fresh API Key

If nothing works, get a completely new API key:

1. Go to https://www.notion.so/my-integrations
2. Delete the old integration (if it exists)
3. Click **"+ New integration"**
4. Choose **"Internal"** integration
5. Name it: **"ILA Platform"**
6. Copy the **Internal Integration Token** (starts with `secret_`)
7. Test it using one of the methods above
8. Use the new key in the ILA app

## Quick Checklist

Before connecting in ILA:
- [ ] Integration exists at https://www.notion.so/my-integrations
- [ ] Integration is active (not deleted)
- [ ] API key starts with `secret_`
- [ ] API key is 50+ characters long
- [ ] API key test passes (using curl/Postman/Node.js)
- [ ] Database is shared with the integration
- [ ] Integration has "Read" and "Update" capabilities

## Still Having Issues?

If your API key test passes but ILA still fails:
1. Check server logs for detailed error messages
2. Make sure you're entering the API key correctly in the ILA app
3. Try disconnecting and reconnecting
4. Clear browser cache and try again

