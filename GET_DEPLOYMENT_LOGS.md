# How to Get Vercel Deployment Logs

## Current Status
✅ Project linked to Vercel
✅ GitHub repository connected
⏳ No deployments yet

## Deploy Now and View Logs

### Option 1: Deploy via CLI and See Live Output

```bash
cd V_secondguess
npx vercel --prod
```

This will:
1. Build your project
2. Show real-time build output
3. Deploy to production
4. Give you the deployment URL

### Option 2: Deploy via Dashboard and View Logs

1. **Trigger Deployment**
   - Go to https://vercel.com/dashboard
   - Find your `v-secondguess` project
   - Click "Deploy" or push to GitHub main branch

2. **View Live Build Logs**
   - Click on the deployment in progress
   - See real-time build output
   - Watch for any errors

3. **View Completed Deployment Logs**
   - Go to "Deployments" tab
   - Click on any deployment
   - Click "Building" or "Functions" tab
   - View complete logs

## Get Logs for Existing Deployment

### Via CLI

```bash
# List all deployments
npx vercel ls

# Get deployment info
npx vercel inspect <deployment-url>

# Get build logs
npx vercel inspect <deployment-url> --logs

# Get function logs (after deployment)
npx vercel logs <deployment-url>
```

### Via Dashboard

1. Go to https://vercel.com/dashboard
2. Select `v-secondguess` project
3. Click "Deployments"
4. Click on a deployment
5. View tabs:
   - **Building**: Build logs
   - **Functions**: Runtime logs
   - **Source**: Source code
   - **Runtime Logs**: Real-time function execution

## Common Commands

```bash
# Deploy to preview (test deployment)
npx vercel

# Deploy to production
npx vercel --prod

# View project info
npx vercel project ls

# View recent deployments
npx vercel ls v-secondguess

# Get deployment URL
npx vercel ls v-secondguess --json | jq '.[0].url'

# Stream function logs in real-time
npx vercel logs --follow

# Get logs for specific deployment
npx vercel logs <deployment-url>
```

## Before First Deployment

Make sure you have:

1. **Environment Variables Set**
   ```bash
   # Add via CLI
   npx vercel env add STT_API_KEY production
   npx vercel env add TTS_API_KEY production
   npx vercel env add NODE_ENV production
   
   # Or add via dashboard
   # https://vercel.com/dashboard → Project → Settings → Environment Variables
   ```

2. **Latest Code Pushed**
   ```bash
   git add -A
   git commit -m "Ready for deployment"
   git push origin main
   ```

## Deployment Output Example

When you run `npx vercel --prod`, you'll see:

```
Vercel CLI 48.9.1
🔍  Inspect: https://vercel.com/...
✅  Production: https://v-secondguess.vercel.app [2m]
📝  Deployed to production. Run `vercel --prod` to overwrite later deployments.
```

## View Logs After Deployment

### Build Logs
```bash
npx vercel inspect https://v-secondguess.vercel.app --logs
```

### Runtime Logs (Function Execution)
```bash
# Real-time logs
npx vercel logs https://v-secondguess.vercel.app --follow

# Last 100 logs
npx vercel logs https://v-secondguess.vercel.app --limit 100

# Logs since specific time
npx vercel logs https://v-secondguess.vercel.app --since 1h
```

## Troubleshooting

### No Logs Showing

**Problem**: `npx vercel logs` shows nothing

**Solutions**:
1. Make sure deployment is complete
2. Try accessing an API endpoint to generate logs
3. Check dashboard for logs
4. Wait a few minutes for logs to propagate

### Build Failed

**Problem**: Deployment fails during build

**Solutions**:
1. Check build logs: `npx vercel inspect <url> --logs`
2. Look for TypeScript errors
3. Verify all dependencies are in package.json
4. Test build locally: `npm run build`

### Function Errors

**Problem**: API returns 500 errors

**Solutions**:
1. Check function logs in dashboard
2. Verify environment variables are set
3. Test API keys are valid
4. Check for missing dependencies

## Quick Deploy Now

Run this to deploy and see output:

```bash
cd V_secondguess

# Set environment variables first
npx vercel env add STT_API_KEY production
npx vercel env add TTS_API_KEY production
npx vercel env add NODE_ENV production

# Deploy to production
npx vercel --prod
```

## Dashboard Links

- **Project Dashboard**: https://vercel.com/dashboard
- **Deployments**: https://vercel.com/mmteles/v-secondguess
- **Settings**: https://vercel.com/mmteles/v-secondguess/settings
- **Logs**: https://vercel.com/mmteles/v-secondguess/logs

## Next Steps

1. ✅ Project is linked to Vercel
2. ⏳ Add environment variables
3. ⏳ Deploy: `npx vercel --prod`
4. ⏳ View logs and test
5. ⏳ Share deployment URL

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Project Issues: https://github.com/mmteles/V_secondguess/issues
