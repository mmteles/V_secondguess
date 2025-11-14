# How to Access the Application

## ⚠️ IMPORTANT: You're Getting "Cannot Connect" Error

This error means you're not accessing the application correctly.

## ✅ CORRECT Way (Do This!)

### Step 1: Start the Server
```bash
cd V_secondguess
npm run dev
```

You should see:
```
API server started successfully
port: 3000
host: localhost
```

### Step 2: Open in Browser
Open your web browser and go to:
```
http://localhost:3000
```

**That's it!** The page should load and connect automatically.

## ❌ WRONG Ways (Don't Do This!)

### ❌ Don't Open the HTML File Directly
**Wrong:** 
- Double-clicking `index.html` in Finder/Explorer
- Opening `file:///Users/.../V_secondguess/public/index.html`

**Why it fails:** 
- The browser blocks requests from file:// to http://
- This is a security feature
- You MUST use the server

### ❌ Don't Use 127.0.0.1
**Wrong:** `http://127.0.0.1:3000`
**Right:** `http://localhost:3000`

**Why:** The server is configured for localhost specifically.

### ❌ Don't Use Wrong Port
**Wrong:** `http://localhost:8080` or any other port
**Right:** `http://localhost:3000`

**Why:** The server runs on port 3000 by default.

## 🔍 Diagnostic Tool

If you're still having issues, use the diagnostic tool:

1. Make sure server is running
2. Open: http://localhost:3000/diagnostic.html
3. It will run tests and show what's wrong

## 📋 Quick Checklist

Before opening the browser:
- [ ] Server is running (`npm run dev`)
- [ ] You see "API server started successfully" in terminal
- [ ] Port 3000 is shown in terminal

When opening browser:
- [ ] Use `http://localhost:3000` (copy/paste this!)
- [ ] Don't open the HTML file directly
- [ ] Don't use 127.0.0.1
- [ ] Don't use a different port

## 🧪 Test the Server

Run this command to verify server is working:
```bash
curl http://localhost:3000/api/monitoring/health
```

**Expected output:**
```json
{"status":"healthy",...}
```

If you see this, the server is working! The issue is how you're accessing it in the browser.

## 🎯 Step-by-Step (Can't Go Wrong)

1. **Open Terminal**
   ```bash
   cd V_secondguess
   npm run dev
   ```

2. **Wait for this message:**
   ```
   API server started successfully
   port: 3000
   ```

3. **Open Browser**
   - Chrome, Firefox, or Edge (recommended)

4. **Type in address bar:**
   ```
   http://localhost:3000
   ```

5. **Press Enter**

6. **Wait 2-3 seconds**
   - Page should load
   - Session should auto-create
   - You should see "✅ Session started successfully!"

## 🐛 Still Not Working?

### Check Browser Console
1. Press F12
2. Go to Console tab
3. Look for errors
4. Take a screenshot

### Check These:
- [ ] Server terminal shows no errors
- [ ] Browser URL is exactly `http://localhost:3000`
- [ ] Browser console shows `Protocol: http:`
- [ ] Browser console shows `Hostname: localhost`

### Try These:
1. **Hard refresh:** Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Incognito mode:** Open browser in private/incognito mode
3. **Different browser:** Try Chrome if using Firefox, or vice versa
4. **Restart server:** Stop (Ctrl+C) and start again (`npm run dev`)

## 📞 Need More Help?

1. Run diagnostic: http://localhost:3000/diagnostic.html
2. Check CONNECTION_HELP.md
3. Check TROUBLESHOOTING.md
4. Check browser console for specific errors

## 💡 Pro Tip

Bookmark this URL in your browser:
```
http://localhost:3000
```

Then you can just click the bookmark instead of typing it each time!

---

**Remember:** 
- ✅ Always use `http://localhost:3000`
- ❌ Never open the HTML file directly
- ✅ Server must be running first
