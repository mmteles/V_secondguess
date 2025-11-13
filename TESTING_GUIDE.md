# Testing Guide

## Quick Start

1. **Start the server**
   ```bash
   cd V_secondguess
   npm run dev
   ```

2. **Open your browser**
   - Navigate to: http://localhost:3000
   - Open Developer Tools (F12) to see console logs

3. **Test the application**
   - Session should auto-create on page load
   - Type a message and click Send or press Enter
   - AI should respond

## What to Test

### ✅ Session Creation
- **Expected**: Session auto-creates when page loads
- **Check**: Status bar shows "Session: session-web-user-..."
- **Console**: Should see "New session started: session-..."

### ✅ Send Message
- **Action**: Type "I need help creating an SOP for customer onboarding"
- **Expected**: 
  - Your message appears in conversation area
  - AI responds with guidance
- **Console**: Should see "Sending message to session:" and "Message response status: 200"

### ✅ Voice Recording
- **Action**: Click "🎤 Start Voice Conversation"
- **Expected**: 
  - Browser asks for microphone permission
  - Button changes to "⏹️ Stop Recording" (red)
  - Message says "Recording..."
- **Action**: Click button again to stop
- **Expected**: 
  - Message says "Voice recorded!"
  - Button returns to "🎤 Start Voice Conversation" (green)

### ✅ New Session
- **Action**: Click "🔄 New Session"
- **Expected**: 
  - Conversation area clears
  - New session ID in status bar
  - Welcome message appears

### ✅ Error Handling
- **Action**: Try to send empty message
- **Expected**: Error message "Please enter a message"

## API Testing (Command Line)

### Test Session Creation
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-valid-token" \
  -d '{"userId":"test-user-123"}'
```

**Expected Response**:
```json
{
  "sessionId": "session-test-user-123-1234567890",
  "status": "active",
  "createdAt": "2025-11-12T23:00:00.000Z"
}
```

### Test Message Sending
```bash
# Replace SESSION_ID with actual session ID from above
curl -X POST http://localhost:3000/api/conversations/SESSION_ID/input \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-valid-token" \
  -d '{"text":"I need help creating an SOP","type":"text"}'
```

**Expected Response**:
```json
{
  "message": "Thank you for starting to describe your workflow...",
  "requiresConfirmation": false,
  "suggestedActions": ["Describe the main steps", "..."],
  "shouldReadAloud": true,
  "sessionId": "SESSION_ID",
  "timestamp": "2025-11-12T23:00:00.000Z"
}
```

### Test Health Check
```bash
curl http://localhost:3000/api/monitoring/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T23:00:00.000Z",
  "uptime": 12345,
  "version": "1.0.0",
  ...
}
```

## Browser Console Logs

### On Page Load
```
Application initialized
API_BASE: http://localhost:3000/api
Window location: http://localhost:3000/
Starting new session with API_BASE: http://localhost:3000/api
Session response status: 201
New session started: session-web-user-1234567890
```

### On Send Message
```
Sending message to session: session-web-user-1234567890
Message response status: 200
```

### On Voice Recording
```
Audio recorded, size: 12345
```

## Common Issues & Solutions

### Issue: "Failed to start new session: Load failed"
**Cause**: Server not running or CORS issue
**Solution**: 
1. Check server is running: `npm run dev`
2. Check console for detailed error
3. Try refreshing the page

### Issue: Send button does nothing
**Cause**: Empty message or no session
**Solution**: 
1. Type a message first
2. Check console for errors
3. Session will auto-create if missing

### Issue: Voice button shows error
**Cause**: No microphone or permission denied
**Solution**: 
1. Connect a microphone
2. Allow microphone permission when prompted
3. Try a different browser (Chrome recommended)

### Issue: No AI response
**Cause**: Server error or session not found
**Solution**: 
1. Check server logs in terminal
2. Try creating a new session
3. Check network tab in browser dev tools

## Test Checklist

- [ ] Server starts without errors
- [ ] Page loads at http://localhost:3000
- [ ] Session auto-creates on page load
- [ ] Can send text messages
- [ ] AI responds to messages
- [ ] Can start voice recording
- [ ] Can stop voice recording
- [ ] Can create new session
- [ ] Error messages appear when appropriate
- [ ] Console logs show detailed information

## Performance Testing

### Check Memory Usage
```bash
curl http://localhost:3000/api/monitoring/health | jq '.metrics.memoryUsage'
```

### Check Active Sessions
```bash
curl http://localhost:3000/api/monitoring/health | jq '.metrics.activeSessions'
```

## Debugging Tips

1. **Always check browser console** - Most issues show detailed errors there
2. **Check server logs** - Terminal where `npm run dev` is running
3. **Use Network tab** - See actual API requests and responses
4. **Check session ID** - Make sure it's being created and used correctly
5. **Test API directly** - Use curl commands to isolate frontend vs backend issues

## Success Criteria

✅ All tests pass
✅ No errors in console
✅ AI responds within 2 seconds
✅ Voice recording works smoothly
✅ UI is responsive and intuitive

---

**Last Updated**: 2025-11-12 23:06 UTC
