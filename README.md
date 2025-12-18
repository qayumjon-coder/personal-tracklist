# MusicPlaylist - Serverless Music Player

Modern, serverless music player with Supabase backend.

## 🚀 Tech Stack

### Frontend
- **React** + **TypeScript** + **Vite**
- **TailwindCSS** for styling
- **Supabase Client** for database & storage
- **Lucide React** for icons
- Deployed on **Vercel**

### Backend
- **Supabase** - PostgreSQL Database
- **Supabase Storage** - Audio & cover files
- **Serverless** - No backend server needed!

## 📦 Project Structure

```
MusicPlaylist/
├── FrontEnd/          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/       # Supabase client
│   │   ├── services/  # API functions
│   │   └── ...
│   └── package.json
└── .agent/
    └── workflows/
        └── serverless-deployment.md  # Deployment guide
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Supabase account (free tier)

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd MusicPlaylist
```

2. **Create Supabase Project**
- Go to https://supabase.com
- Create a new project
- Run the SQL from `.agent/workflows/serverless-deployment.md`
- Create `music-files` storage bucket (public)
- Copy your project URL and anon key

3. **Setup Frontend**
```bash
cd FrontEnd
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

4. **Access the app**
- Frontend: http://localhost:5173

## 🌐 Deployment

See the detailed deployment guide: [`.agent/workflows/serverless-deployment.md`](.agent/workflows/serverless-deployment.md)

### Quick Deploy Summary

1. **Supabase**: Create project, setup database & storage
2. **Vercel**: Deploy frontend with Supabase credentials

**That's it!** No backend server needed! 🎉

## 📝 Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🎵 Features

- 🎧 Modern audio player with visualizer
- 📝 Song metadata editor
- 📤 Upload new tracks (directly to Supabase)
- ❤️ Like/favorite songs
- 📜 Lyrics support
- 🎨 Category management
- 🔍 Search functionality
- 🎛️ Volume & playback controls
- ⚡ **Serverless** - No backend needed!

## 🆓 Cost

**100% FREE!**
- Supabase: Free tier (500MB database, 1GB storage)
- Vercel: Free tier (100GB bandwidth/month)

## 📄 License

MIT
