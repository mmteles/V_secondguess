# API Key Setup Guide

This guide explains how to configure API keys for the V_secondguess project.

## Required API Keys

The project requires API keys for the following services:

### 1. Speech-to-Text (STT) API
- **Google Cloud Speech-to-Text** (recommended)
- **Azure Speech Services**
- **AWS Transcribe**

### 2. Text-to-Speech (TTS) API
- **Google Cloud Text-to-Speech** (recommended)
- **Azure Speech Services**
- **AWS Polly**

## Setup Instructions

### Step 1: Copy the Environment File

```bash
cp .env.example .env
```

### Step 2: Add Your API Keys

Open the `.env` file and fill in your API keys:

```env
# Speech-to-Text Configuration
STT_PROVIDER=google
STT_API_KEY=YOUR_ACTUAL_API_KEY_HERE

# Text-to-Speech Configuration
TTS_PROVIDER=google
TTS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

### Step 3: Configure Provider (Optional)

If you're using a different provider, change the `STT_PROVIDER` and `TTS_PROVIDER` values:

```env
# For Azure
STT_PROVIDER=azure
TTS_PROVIDER=azure

# For AWS
STT_PROVIDER=aws
TTS_PROVIDER=aws
```

## Getting API Keys

### Google Cloud (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Cloud Speech-to-Text API
   - Cloud Text-to-Speech API
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "API Key"
6. Copy the API key and paste it into your `.env` file

### Azure Speech Services

1. Go to [Azure Portal](https://portal.azure.com/)
2. Create a "Speech Services" resource
3. Go to "Keys and Endpoint"
4. Copy one of the keys and paste it into your `.env` file

### AWS

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to IAM > Users
3. Create a new user with programmatic access
4. Attach policies for Transcribe and Polly
5. Copy the Access Key ID and Secret Access Key
6. Add them to your `.env` file

## Development Mode

In development mode (`NODE_ENV=development`), API keys are optional. The application will use mock implementations if keys are not provided.

## Production Deployment

For production deployment (e.g., Vercel), you need to set environment variables in your hosting platform:

### Vercel

1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add the following variables:
   - `STT_API_KEY`
   - `TTS_API_KEY`
   - `STT_PROVIDER`
   - `TTS_PROVIDER`
   - `NODE_ENV=production`

## Security Notes

⚠️ **Important:**
- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Use different API keys for development and production
- Rotate your API keys regularly
- Set up billing alerts on your cloud provider

## Troubleshooting

### API Key Not Working

1. Verify the API key is correct (no extra spaces)
2. Check that the API is enabled in your cloud console
3. Verify billing is set up on your cloud account
4. Check API quotas and limits

### Provider Not Supported

Make sure the provider value is one of: `google`, `azure`, or `aws`

## Additional Configuration

You can customize other settings in the `.env` file:

- **Audio Settings**: Sample rate, channels, bit depth
- **AI Models**: GPT-4 or other models
- **Logging**: Log level and format
- **Export**: Document templates and watermarks

See `.env.example` for all available options.
