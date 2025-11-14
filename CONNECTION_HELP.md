# Connection Help

## Error: "Cannot connect to server. Is the server running at http://localhost:3000/api?"

This error means your browser cannot reach the API server. Here's how to fix it:

## ✅ Correct Way to Access the Application

**DO THIS:**
1. Make sure server is running:
   ```bash
   cd V_secondguess
   npm run dev
   ```

2. Open your browser and go to:
   ```
   http://localhost:3000
   ```

**DON'T DO THIS:**
- ❌ Don't open the HTML file directly (file:///path/to/index.html)
- ❌ Don't use a different port
- ❌ Don't use 127.0.0.1 (use localhost instead)

## Quick Check

Run this command to verify the server is working:
```bash
curl http://localhost:3000/api/monitoring/health
```

**Expected output:**
```json
{"status":"healthy",...}
```

If you see this, the server is working!

## Step-by-Step Fix

### Step 1: Check Server is Running

In your terminal, you should see:
```
API server started successfully
port: 3000
host: localhost
```

If you don't see this:
```bash
cd V_secondguess
npm run dev
```

### Step 2: Verify the URL

In your browser's address bar, you should see:
```
http://localhost:3000
```

NOT:
- ❌ `file:///Users/.../index.html`
- ❌ `http://127.0.0.1:3000`
- ❌ Any other URL

### Step 3: Check Browser Console

1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for these messages:
   ```
   Application initialized
   API_BASE: http://localhost:3000/api
   Window location: http://localhost:3000/
   Protocol: http:
   Hostname: localhost
   ```

If you see `Protocol: file:`, you're opening the file directly. Use http://localhost:3000 instead!

### Step 4: Clear Browser Cache

1. Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Or right-click refresh button → "Empty Cache and Hard Reload"

### Step 5: Try the Retry Button

If you see the error message, a "🔄 Retry Connection" button should appear. Click it!

## Common Mistakes

### Mistake 1: Opening HTML File Directly
**Wrong:** Double-clicking `index.html` in Finder/Explorer
**Right:** Opening http://localhost:3000 in browser

### Mistake 2: Server Not Running
**Check:** Look at terminal where you ran `npm run dev`
**Fix:** Run `npm run dev` if not running

### Mistake 3: Wrong Port
**Check:** Server should say "port: 3000"
**Fix:** Make sure nothing else is using port 3000

### Mistake 4: Browser Cache
**Check:** Hard refresh the page
**Fix:** Ctrl+Shift+R or clear cache

## Still Not Working?

### Test the API Directly

```bash
# Test 1: Health check
curl http://localhost:3000/api/monitoring/health

# Test 2: Create session
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-valid-token" \
  -d '{"userId":"test"}'
```

If these work, the server is fine. The issue is with the browser connection.

### Check Firewall

Make sure your firewall isn't blocking localhost:3000

### Try Different Browser

- Chrome (recommended)
- Firefox
- Edge
- Safari

### Check Console for Specific Errors

Look for:
- CORS errors → Server should handle this automatically
- Network errors → Check server is running
- Timeout errors → Server might be slow
- 404 errors → Wrong URL

## Visual Indicators

When the page loads correctly, you should see:
- ✅ Green dot in status bar (bottom left)
- ✅ "Connected" status
- ✅ Session ID in status bar (bottom right)
- ✅ Welcome message from AI

When there's a problem:
- ❌ Red dot in status bar
- ❌ "Disconnected" or "API Offline" status
- ❌ Error message in conversation area
- ❌ "🔄 Retry Connection" button

## Quick Diagnostic

Run this in your terminal:
```bash
# Check if server is running
curl http://localhost:3000/

# Should return HTML (not error)
```

If this works but browser doesn't:
1. Check browser console (F12)
2. Check you're using http://localhost:3000
3. Try incognito/private mode
4. Clear browser cache

## Contact

If none of this helps:
1. Check browser console for errors
2. Check server terminal for errors
3. See TROUBLESHOOTING.md for more details

---

**Remember:** Always access via http://localhost:3000, never open the HTML file directly!
