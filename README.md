# V_secondguess - Vercel Deployment Wrapper

This repository is a thin wrapper for deploying the [secondguess](https://github.com/kw0ntum/secondguess) application to Vercel.

## 📁 Structure

```
V_secondguess/
├── secondguess/          # Git submodule - main application code
├── api/                  # Vercel serverless function entry point
├── vercel.json           # Vercel deployment configuration
├── .vercel/              # Vercel deployment metadata
├── .env                  # Environment variables (not in git)
└── .env.example          # Environment variables template
```

## 🚀 Quick Start

### 1. Clone with Submodule

```bash
git clone --recursive https://github.com/mmteles/V_secondguess.git
cd V_secondguess
```

If you already cloned without `--recursive`:

```bash
git submodule init
git submodule update
```

### 2. Install Dependencies

```bash
cd secondguess
npm install
```

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Run Locally

```bash
cd secondguess
npm run dev
```

Open http://localhost:3000

## 📚 Documentation

All documentation is in the `secondguess/` submodule:

- **[QUICK_START.md](secondguess/QUICK_START.md)** - Quick start guide
- **[HOW_TO_ACCESS.md](secondguess/HOW_TO_ACCESS.md)** - How to access the application
- **[DEPLOYMENT.md](secondguess/DEPLOYMENT.md)** - Deployment guide
- **[TROUBLESHOOTING.md](secondguess/TROUBLESHOOTING.md)** - Troubleshooting guide
- **[API_SETUP.md](secondguess/API_SETUP.md)** - API setup instructions

## 🔧 Vercel Deployment

This repository is configured for automatic deployment to Vercel.

### Deployment URL
https://v-secondguess.vercel.app

### How It Works

1. **Vercel Configuration**: `vercel.json` defines routing and build settings
2. **Serverless Entry Point**: `api/index.ts` exports the Express app for Vercel
3. **Submodule**: The main application code is in the `secondguess` submodule
4. **Build Process**: Vercel builds the TypeScript code from the submodule

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🔄 Updating the Submodule

When the `secondguess` repository is updated:

```bash
# Update submodule to latest commit
git submodule update --remote secondguess

# Commit the submodule update
git add secondguess
git commit -m "Update secondguess submodule"
git push
```

## 🌿 Branches

- **main** - Production deployment
- **secondguess submodule** - Points to `consolidated-main` branch

## 📝 Environment Variables

Required environment variables (see `.env.example`):

```env
# Google Cloud API Keys (optional - mocks work without them)
GOOGLE_CLOUD_API_KEY=your-key-here

# Server Configuration
NODE_ENV=production
PORT=3000
```

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         Vercel Platform             │
│  ┌───────────────────────────────┐  │
│  │    V_secondguess (Wrapper)    │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  secondguess (Submodule)│  │  │
│  │  │  - src/                 │  │  │
│  │  │  - public/              │  │  │
│  │  │  - All application code │  │  │
│  │  └─────────────────────────┘  │  │
│  │  - api/index.ts (Entry)       │  │
│  │  - vercel.json (Config)       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 🔗 Related Repositories

- **Main Application**: [kw0ntum/secondguess](https://github.com/kw0ntum/secondguess)
- **Deployment Wrapper**: [mmteles/V_secondguess](https://github.com/mmteles/V_secondguess) (this repo)

## 🤝 Contributing

All application code changes should be made in the [secondguess](https://github.com/kw0ntum/secondguess) repository.

This repository should only contain:
- Vercel deployment configuration
- Serverless function entry point
- Deployment-specific documentation

## 📄 License

MIT

---

**Note**: This is a deployment wrapper. For application documentation and development, see the [secondguess](https://github.com/kw0ntum/secondguess) repository.
