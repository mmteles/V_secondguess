# Troubleshooting Guide

## "Failed to start new session: Load failed" Error

This error typically means the browser cannot connect to the API server. Here's how to fix it:

### Step 1: Verify Server is Running

```bash
# Check if server is running
curl http://localhost:3000/api/monitoring/health

# Expected output: {"status":"healthy",...}
```

If this fails, start the server:
```bash
cd V_secondguess
npm run dev
```

### Step 2: Check Browser Console

1. Open the page: http://localhost:3000
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for error messages

**Common errors and solutions:**

#### "Failed to fetch" or "Load failed"
- **Cause**: Server not running or wrong URL
- **Solution**: 
  1. Check server is running: `npm run dev`
  2. Verify URL in console shows: `API_BASE: http://localhost:3000/api`
  3. Try refreshing the page

#### "CORS error" or "Access-Control-Allow-Origin"
- **Cause**: CORS configuration issue
- **Solution**: Server should already have CORS enabled. Check server logs.

#### "NetworkError" or "ERR_CONNECTION_REFUSED"
- **Cause**: Server not running or firewall blocking
- **Solution**: 
  1. Start server: `npm run dev`
  2. Check firewall settings
  3. Try a different port if 3000 is blocked

#### "Timeout" or "AbortError"
- **Cause**: Server is slow or not responding
- **Solution**: 
  1. Check server logs for errors
  2. Restart server
  3. Check system resources (CPU, memory)

### Step 3: Test API Directly

Test the API endpoints directly:

```bash
# Test session creation
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-valid-token" \
  -d '{"userId":"test-user"}'

# Expected: {"sessionId":"session-test-user-...","status":"active",...}
```

If this works but the browser doesn't, it's likely a browser-specific issue.

### Step 4: Check Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for the POST request to `/api/sessions`
5. Check:
   - Status code (should be 201)
   - Response body
   - Request headers
   - Response headers

### Step 5: Try Different Browser

Sometimes browser extensions or settings can interfere:
- Try Chrome/Edge (recommended)
- Try Firefox
- Try Safari
- Try incognito/private mode

### Step 6: Clear Browser Cache

1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 7: Check Server Logs

Look at the terminal where `npm run dev` is running:
- Should see: "API server started successfully"
- Should see: "port: 3000"
- Look for any error messages

## Other Common Issues

### Dashboard Link Not Working

**Symptom**: Clicking Dashboard shows 404 or blank page

**Solution**: Dashboard is at `/dashboard` (not `/api/dashboard`)
- URL should be: http://localhost:3000/dashboard

### Send Button Does Nothing

**Symptom**: Clicking Send button has no effect

**Solutions**:
1. Check console for errors
2. Make sure you typed a message
3. Check session was created (status bar shows session ID)
4. Try clicking "New Session" button

### Voice Button Errors

**Symptom**: Voice button shows permission error

**Solutions**:
1. Allow microphone permission when prompted
2. Check microphone is connected
3. Try a different browser (Chrome recommended)
4. Check browser settings for microphone access

### No AI Response

**Symptom**: Message sent but no response from AI

**Solutions**:
1. Check server logs for errors
2. Check session ID is valid
3. Try creating new session
4. Check network tab for failed requests

## Quick Diagnostic Commands

Run these to check everything:

```bash
# 1. Check server is running
curl http://localhost:3000/

# 2. Check API health
curl http://localhost:3000/api/monitoring/health

# 3. Test session creation
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-valid-token" \
  -d '{"userId":"test"}'

# 4. Check dashboard
curl http://localhost:3000/dashboard
```

All should return HTML or JSON (not errors).

## Still Having Issues?

1. **Restart everything**:
   ```bash
   # Stop server (Ctrl+C)
   # Clear node modules
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

2. **Check port 3000 is not in use**:
   ```bash
   # macOS/Linux
   lsof -i :3000
   
   # If something is using it, kill it or use different port
   ```

3. **Check the logs**:
   - Browser console (F12)
   - Server terminal output
   - Look for specific error messages

4. **Use the retry button**:
   - If you see "Load failed" error
   - Click the "🔄 Retry Connection" button
   - This will attempt to reconnect

## Debug Mode

To get more detailed logs, open browser console and run:

```javascript
// Enable verbose logging
localStorage.setItem('debug', 'true');

// Reload page
location.reload();
```

This will show all API calls and responses in the console.

## Contact Information

If none of these solutions work:
1. Check the GitHub issues
2. Create a new issue with:
   - Browser console logs
   - Server terminal output
   - Steps to reproduce
   - Your environment (OS, browser, Node version)

---

**Last Updated**: 2025-11-14
