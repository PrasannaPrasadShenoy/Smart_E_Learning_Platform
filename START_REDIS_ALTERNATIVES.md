# Redis Setup Alternatives (Without Docker Desktop)

Since Docker Desktop requires WSL update, here are **3 working alternatives**:

---

## ✅ Option 1: Run Redis Directly in WSL (Recommended)

### Step 1: Check if WSL is installed
```bash
wsl --status
```

### Step 2: Install Redis in WSL
Open **WSL** (Ubuntu terminal) and run:
```bash
sudo apt update
sudo apt install -y redis-server
sudo service redis-server start
```

### Step 3: Verify Redis is running
```bash
redis-cli ping
```
Should return: `PONG`

### Step 4: Start Redis automatically (optional)
```bash
sudo service redis-server start
```

**To start Redis every time you restart:**
```bash
sudo systemctl enable redis-server
```

### Start/Stop Commands:
- **Start**: `sudo service redis-server start`
- **Stop**: `sudo service redis-server stop`
- **Status**: `sudo service redis-server status`

---

## ✅ Option 2: Use Memurai (Windows Native Redis)

Memurai is a Windows-compatible Redis alternative that runs natively on Windows.

### Step 1: Download Memurai
- Go to: https://www.memurai.com/get-memurai
- Download the **Developer Edition** (Free)

### Step 2: Install Memurai
- Run the installer
- Follow the installation wizard
- Memurai will start automatically as a Windows service

### Step 3: Verify it's running
- Open **Services** (Win + R → `services.msc`)
- Look for "Memurai" service - should be "Running"

### Step 4: Update your `.env` (if needed)
Your current config (`redis://localhost:6379`) should work automatically!

**That's it!** Your Node.js server will connect to Memurai the same way.

---

## ✅ Option 3: Use Redis Cloud (Free Tier)

Use a cloud Redis instance - no local installation needed.

### Step 1: Sign up for Redis Cloud
- Go to: https://redis.com/try-free/
- Sign up for free account
- Create a free database (30MB free)

### Step 2: Get your Redis URL
- Copy the connection URL (looks like: `redis://default:password@redis-xxxxx.cloud.redislabs.com:12345`)

### Step 3: Update your `.env` file
```env
REDIS_URL=redis://default:yourpassword@redis-xxxxx.cloud.redislabs.com:12345
```

**That's it!** No local Redis needed.

---

## ✅ Option 4: Fix WSL Update Issue (If you want Docker later)

### Try these commands in PowerShell (as Administrator):

1. **Update WSL manually:**
```powershell
wsl --update
```

2. **If that fails, try:**
```powershell
wsl --set-default-version 2
wsl --update --web-download
```

3. **Restart your computer**

4. **Verify WSL version:**
```powershell
wsl --status
```

---

## 🚀 Quick Start Guide

### For Development (Fastest):
**Use Option 1 (WSL)** - It's already installed and works immediately.

### For Production-like Setup:
**Use Option 2 (Memurai)** - Native Windows, works like Docker but simpler.

### For No Local Setup:
**Use Option 3 (Redis Cloud)** - Zero installation, just update `.env`.

---

## Testing Redis Connection

After setting up any option, test it:

```bash
# In Node.js (or use redis-cli if installed)
node -e "const redis = require('ioredis'); const r = new redis('redis://localhost:6379'); r.ping().then(console.log).then(() => r.quit());"
```

Should return: `PONG`

---

## Current Setup

Your server is configured to use: `redis://localhost:6379`

All options above will work with this configuration! Just pick the easiest one for you.

