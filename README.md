# V_secondguess - AI Voice SOP Agent

AI-powered conversational system that generates Standard Operating Procedures through voice-based interaction.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mmteles/V_secondguess)

### One-Click Deployment

1. Click the "Deploy with Vercel" button above
2. Sign in to Vercel with GitHub
3. Add your environment variables:
   - `STT_API_KEY` - Your Speech-to-Text API key
   - `TTS_API_KEY` - Your Text-to-Speech API key
   - `NODE_ENV=production`
4. Click "Deploy"
5. Done! Your app is live 🎉

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud API keys (or Azure/AWS)

## 🔧 Local Development

### 1. Clone the repository

```bash
git clone https://github.com/mmteles/V_secondguess.git
cd V_secondguess
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
STT_API_KEY=your_speech_to_text_api_key
TTS_API_KEY=your_text_to_speech_api_key
```

See [API_SETUP.md](./API_SETUP.md) for detailed instructions.

### 4. Run development server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### 5. Build for production

```bash
npm run build
npm start
```

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete Vercel deployment guide
- **[API_SETUP.md](./API_SETUP.md)** - How to get and configure API keys
- **[UPDATES.md](./UPDATES.md)** - Package updates and changes

## 🏗️ Project Structure

```
V_secondguess/
├── api/                 # Vercel serverless functions
├── src/
│   ├── api/            # Express API routes
│   ├── services/       # Business logic services
│   ├── models/         # Data models
│   ├── ui/             # UI components
│   └── utils/          # Utilities
├── public/             # Static files
├── dist/               # Build output
└── vercel.json         # Vercel configuration
```

## 🔑 Environment Variables

### Required
- `STT_API_KEY` - Speech-to-Text API key
- `TTS_API_KEY` - Text-to-Speech API key
- `NODE_ENV` - Environment (development/production)

### Optional
- `PORT` - Server port (default: 3000)
- `STT_PROVIDER` - STT provider (google/azure/aws)
- `TTS_PROVIDER` - TTS provider (google/azure/aws)
- `CONVERSATION_MODEL` - AI model (default: gpt-4)

See `.env.example` for all available options.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linter
- `npm run vercel-build` - Build for Vercel deployment

## 🔒 Security

- ✅ 0 vulnerabilities
- ✅ All packages up to date
- ✅ Security headers enabled (Helmet)
- ✅ Rate limiting configured
- ✅ CORS protection

## 🌐 API Endpoints

- `POST /api/session` - Create new session
- `POST /api/conversation` - Send conversation input
- `GET /api/sop/:id` - Get SOP document
- `POST /api/sop/generate` - Generate SOP
- `GET /api/monitoring/health` - Health check
- `GET /api/dashboard/stats` - Dashboard statistics

## 🛠️ Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Speech**: Google Cloud Speech-to-Text & Text-to-Speech
- **PDF**: pdf-lib, PDFKit
- **Documents**: docx
- **Charts**: Chart.js, D3.js, Mermaid
- **Testing**: Jest
- **Deployment**: Vercel

## 📊 Features

- 🎤 Voice-based interaction
- 📝 Automatic SOP generation
- 🔄 Iterative refinement
- 📊 Visual diagrams and charts
- 📄 Multiple export formats (PDF, DOCX, HTML, Markdown)
- 🔍 Quality checkpoints
- 📈 Real-time monitoring
- 🔐 Secure and scalable

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Documentation**: See docs in this repository
- **Issues**: [GitHub Issues](https://github.com/mmteles/V_secondguess/issues)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

## 🎯 Roadmap

- [ ] Add more AI models support
- [ ] Implement real-time collaboration
- [ ] Add more export templates
- [ ] Mobile app support
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

## ⚡ Performance

- Serverless architecture
- Auto-scaling
- Edge caching
- Optimized bundle size
- Fast cold starts

## 🔄 Updates

Last updated: November 12, 2025

See [UPDATES.md](./UPDATES.md) for recent changes.

---

**Made with ❤️ for better documentation**

**Deploy now**: [vercel.com/new/clone?repository-url=https://github.com/mmteles/V_secondguess](https://vercel.com/new/clone?repository-url=https://github.com/mmteles/V_secondguess)
