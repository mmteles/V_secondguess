# 🚀 Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment.

## Pre-Deployment

- [ ] **API Keys Ready**
  - [ ] Speech-to-Text API key
  - [ ] Text-to-Speech API key
  - [ ] Keys are valid and have billing enabled

- [ ] **Code Ready**
  - [x] All changes committed to GitHub
  - [x] Latest code pushed to `main` branch
  - [x] No merge conflicts

- [ ] **Configuration Files**
  - [x] `vercel.json` configured
  - [x] `package.json` has `vercel-build` script
  - [x] `.vercelignore` excludes unnecessary files
  - [x] `api/index.ts` serverless entry point created

## Deployment Steps

### Option A: Vercel Dashboard (Easiest)

1. - [ ] Go to [vercel.com/new](https://vercel.com/new)
2. - [ ] Sign in with GitHub
3. - [ ] Click "Import Project"
4. - [ ] Select `mmteles/V_secondguess` repository
5. - [ ] Configure project:
   - [ ] Project name: `v-secondguess`
   - [ ] Framework: Other
   - [ ] Build command: `npm run build`
   - [ ] Output directory: `dist`
6. - [ ] Add environment variables (see below)
7. - [ ] Click "Deploy"
8. - [ ] Wait for deployment (2-5 minutes)

### Option B: Vercel CLI

1. - [ ] Install Vercel CLI: `npm install -g vercel`
2. - [ ] Login: `vercel login`
3. - [ ] Deploy: `vercel` (from project directory)
4. - [ ] Add environment variables: `vercel env add`
5. - [ ] Deploy to production: `vercel --prod`

## Environment Variables to Add

Copy these to Vercel's Environment Variables section:

### Required Variables
```
NODE_ENV=production
STT_API_KEY=your_actual_api_key_here
TTS_API_KEY=your_actual_api_key_here
```

### Recommended Variables
```
STT_PROVIDER=google
TTS_PROVIDER=google
STT_LANGUAGE=en-US
CORS_ORIGIN=*
PORT=3000
```

### Optional Variables
```
CONVERSATION_MODEL=gpt-4
SOP_MODEL=gpt-4
MAX_TOKENS=4000
AI_TEMPERATURE=0.7
STT_CONFIDENCE_THRESHOLD=0.7
TTS_DEFAULT_VOICE=en-US-Standard-A
```

## Post-Deployment Testing

- [ ] **Deployment Successful**
  - [ ] Build completed without errors
  - [ ] Deployment URL received
  - [ ] No error messages in Vercel dashboard

- [ ] **API Health Check**
  ```bash
  curl https://your-app.vercel.app/api/monitoring/health
  ```
  - [ ] Returns 200 OK
  - [ ] Response includes health status

- [ ] **Test Session Creation**
  ```bash
  curl -X POST https://your-app.vercel.app/api/session \
    -H "Content-Type: application/json" \
    -d '{"userId": "test-user"}'
  ```
  - [ ] Returns session ID
  - [ ] No errors in response

- [ ] **Check Function Logs**
  - [ ] Go to Vercel Dashboard → Deployments
  - [ ] Click on latest deployment
  - [ ] Check "Functions" tab
  - [ ] No error logs present

- [ ] **Test Static Files**
  - [ ] Visit `https://your-app.vercel.app/`
  - [ ] Static files load correctly
  - [ ] No 404 errors

## Configuration Verification

- [ ] **Environment Variables Set**
  - [ ] All required variables added
  - [ ] No typos in variable names
  - [ ] API keys are correct

- [ ] **Domain Configuration**
  - [ ] Default Vercel domain works
  - [ ] Custom domain added (if applicable)
  - [ ] SSL certificate active

- [ ] **CORS Configuration**
  - [ ] CORS_ORIGIN set correctly
  - [ ] API accessible from frontend
  - [ ] No CORS errors in browser console

## Monitoring Setup

- [ ] **Vercel Analytics**
  - [ ] Enable Analytics in project settings
  - [ ] Verify data is being collected

- [ ] **Function Logs**
  - [ ] Know how to access logs
  - [ ] Set up log alerts (optional)

- [ ] **Performance Monitoring**
  - [ ] Check Speed Insights
  - [ ] Monitor function execution time
  - [ ] Identify slow endpoints

## Security Checklist

- [ ] **API Keys**
  - [ ] Not committed to repository
  - [ ] Only in Vercel environment variables
  - [ ] Different keys for dev/prod

- [ ] **CORS**
  - [ ] Set to specific origins in production
  - [ ] Not using `*` in production (if possible)

- [ ] **Rate Limiting**
  - [ ] Enabled in application
  - [ ] Tested and working

- [ ] **Security Headers**
  - [ ] Helmet middleware enabled
  - [ ] CSP headers configured

## Troubleshooting

If deployment fails, check:

- [ ] **Build Errors**
  - [ ] Check build logs in Vercel
  - [ ] Verify TypeScript compiles locally
  - [ ] All dependencies installed

- [ ] **Runtime Errors**
  - [ ] Check function logs
  - [ ] Verify environment variables
  - [ ] Test API keys are valid

- [ ] **Timeout Issues**
  - [ ] Functions complete within 30s
  - [ ] Increase maxDuration if needed
  - [ ] Optimize slow operations

## Rollback Plan

If something goes wrong:

1. - [ ] Go to Vercel Dashboard → Deployments
2. - [ ] Find last working deployment
3. - [ ] Click "..." menu → "Promote to Production"
4. - [ ] Verify rollback successful

## Documentation

- [ ] **Update Documentation**
  - [ ] Add production URL to README
  - [ ] Update API endpoint examples
  - [ ] Document any deployment-specific notes

- [ ] **Team Communication**
  - [ ] Notify team of deployment
  - [ ] Share production URL
  - [ ] Document any issues encountered

## Continuous Deployment

- [ ] **Auto-Deploy Configured**
  - [ ] Pushes to `main` auto-deploy
  - [ ] Preview deployments for PRs
  - [ ] Deployment notifications enabled

## Performance Optimization

- [ ] **Function Performance**
  - [ ] Functions execute in < 10s
  - [ ] Memory usage optimized
  - [ ] Cold start time acceptable

- [ ] **Caching**
  - [ ] Static files cached
  - [ ] API responses cached (if applicable)
  - [ ] Edge caching enabled

## Final Verification

- [ ] **All Systems Go**
  - [ ] Deployment successful ✅
  - [ ] All tests passing ✅
  - [ ] No errors in logs ✅
  - [ ] API responding correctly ✅
  - [ ] Frontend can connect ✅

## Next Steps

After successful deployment:

1. - [ ] Test with real users
2. - [ ] Monitor performance metrics
3. - [ ] Set up alerts for errors
4. - [ ] Plan for scaling if needed
5. - [ ] Document lessons learned

---

## Quick Links

- **Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Project URL**: `https://v-secondguess.vercel.app`
- **GitHub Repo**: [github.com/mmteles/V_secondguess](https://github.com/mmteles/V_secondguess)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **API Setup**: [API_SETUP.md](./API_SETUP.md)

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Production URL**: _____________
**Status**: ⬜ Success / ⬜ Issues

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________
