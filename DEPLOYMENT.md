# Vercel Deployment Guide - V_secondguess

This guide walks you through deploying the V_secondguess project to Vercel.

## Prerequisites

1. **GitHub Account** - Your code is already on GitHub at `https://github.com/mmteles/V_secondguess`
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **API Keys** - Have your Google Cloud (or Azure/AWS) API keys ready

## Quick Deploy

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Sign in with your GitHub account

2. **Import Repository**
   - Click "Import Project"
   - Select "Import Git Repository"
   - Choose `mmteles/V_secondguess`
   - Click "Import"

3. **Configure Project**
   - **Project Name**: `v-secondguess` (or your preferred name)
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variables**
   Click "Environment Variables" and add:

   ```
   NODE_ENV=production
   STT_PROVIDER=google
   STT_API_KEY=your_speech_to_text_api_key
   STT_LANGUAGE=en-US
   STT_CONFIDENCE_THRESHOLD=0.7
   STT_MAX_DURATION=300
   
   TTS_PROVIDER=google
   TTS_API_KEY=your_text_to_speech_api_key
   TTS_DEFAULT_VOICE=en-US-Standard-A
   TTS_AUDIO_FORMAT=mp3
   TTS_SAMPLE_RATE=22050
   
   PORT=3000
   CORS_ORIGIN=*
   
   CONVERSATION_MODEL=gpt-4
   SOP_MODEL=gpt-4
   MAX_TOKENS=4000
   AI_TEMPERATURE=0.7
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (2-5 minutes)
   - Your app will be live at `https://v-secondguess.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Project Directory**
   ```bash
   cd V_secondguess
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? `Y`
   - Which scope? Select your account
   - Link to existing project? `N`
   - What's your project's name? `v-secondguess`
   - In which directory is your code located? `./`

5. **Add Environment Variables**
   ```bash
   vercel env add STT_API_KEY
   vercel env add TTS_API_KEY
   vercel env add NODE_ENV
   # Add all other environment variables
   ```

6. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `STT_API_KEY` | Speech-to-Text API key | Your Google Cloud API key |
| `TTS_API_KEY` | Text-to-Speech API key | Your Google Cloud API key |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `STT_PROVIDER` | STT provider | `google` |
| `TTS_PROVIDER` | TTS provider | `google` |
| `STT_LANGUAGE` | Speech language | `en-US` |
| `CORS_ORIGIN` | CORS origin | `*` |
| `CONVERSATION_MODEL` | AI model | `gpt-4` |
| `MAX_TOKENS` | Max AI tokens | `4000` |

See `.env.example` for all available variables.

## Project Structure for Vercel

```
V_secondguess/
├── api/
│   └── index.ts          # Vercel serverless entry point
├── src/
│   ├── api/
│   │   └── server.ts     # Express app
│   └── ...
├── public/               # Static files
├── dist/                 # Build output
├── vercel.json          # Vercel configuration
└── package.json
```

## Vercel Configuration

The `vercel.json` file configures:
- **Serverless Functions**: API routes run as serverless functions
- **Memory**: 1024 MB per function
- **Max Duration**: 30 seconds per request
- **Rewrites**: Routes `/api/*` to serverless functions
- **Headers**: CORS headers for API routes

## API Endpoints

After deployment, your API will be available at:

```
https://your-app.vercel.app/api/session
https://your-app.vercel.app/api/conversation
https://your-app.vercel.app/api/sop
https://your-app.vercel.app/api/monitoring
https://your-app.vercel.app/api/dashboard
```

## Testing the Deployment

1. **Check Health Endpoint**
   ```bash
   curl https://your-app.vercel.app/api/monitoring/health
   ```

2. **Test API**
   ```bash
   curl -X POST https://your-app.vercel.app/api/session \
     -H "Content-Type: application/json" \
     -d '{"userId": "test-user"}'
   ```

3. **View Logs**
   - Go to Vercel Dashboard
   - Select your project
   - Click "Deployments"
   - Click on the latest deployment
   - View "Functions" logs

## Troubleshooting

### Build Fails

**Issue**: TypeScript compilation errors

**Solution**: The project has some structural TypeScript errors. These are warnings and won't prevent deployment, but you may want to fix them:
- Check `src/services/service-orchestrator.ts`
- Check `src/ui/components/VoiceInterface.ts`

### API Not Working

**Issue**: 500 errors on API calls

**Solutions**:
1. Check environment variables are set correctly
2. Verify API keys are valid
3. Check function logs in Vercel dashboard
4. Ensure `NODE_ENV=production` is set

### Timeout Errors

**Issue**: Functions timing out

**Solutions**:
1. Increase `maxDuration` in `vercel.json` (max 60s on Pro plan)
2. Optimize long-running operations
3. Consider using Vercel Edge Functions for faster response

### CORS Errors

**Issue**: CORS errors in browser

**Solution**: Update `CORS_ORIGIN` environment variable:
```bash
vercel env add CORS_ORIGIN
# Enter your frontend domain: https://your-frontend.com
```

## Continuous Deployment

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: When you create a pull request

To disable auto-deployment:
1. Go to Project Settings
2. Click "Git"
3. Configure deployment branches

## Custom Domain

1. Go to Project Settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Wait for SSL certificate (automatic)

## Monitoring

### Vercel Analytics
- Go to your project dashboard
- Click "Analytics" tab
- View real-time metrics

### Function Logs
- Go to "Deployments"
- Click on a deployment
- View "Functions" tab
- See real-time logs

### Performance
- Check "Speed Insights" tab
- Monitor function execution time
- Optimize slow endpoints

## Scaling

Vercel automatically scales based on traffic:
- **Hobby Plan**: Unlimited deployments, 100GB bandwidth
- **Pro Plan**: Higher limits, longer function duration
- **Enterprise**: Custom limits, SLA

## Security

1. **Environment Variables**: Never commit API keys
2. **CORS**: Set specific origins in production
3. **Rate Limiting**: Already configured in the app
4. **Helmet**: Security headers already enabled

## Cost Optimization

1. **Function Duration**: Keep functions under 10s when possible
2. **Memory**: Use 1024 MB (default) unless you need more
3. **Bandwidth**: Optimize response sizes
4. **Caching**: Use Vercel's edge caching

## Rollback

If something goes wrong:
1. Go to "Deployments"
2. Find a working deployment
3. Click "..." menu
4. Select "Promote to Production"

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Project Issues**: [GitHub Issues](https://github.com/mmteles/V_secondguess/issues)

## Next Steps

After deployment:
1. ✅ Test all API endpoints
2. ✅ Configure custom domain (optional)
3. ✅ Set up monitoring alerts
4. ✅ Enable Vercel Analytics
5. ✅ Test with real API keys
6. ✅ Update frontend to use production API URL

---

**Deployment Status**: Ready to deploy ✅
**Last Updated**: November 12, 2025
