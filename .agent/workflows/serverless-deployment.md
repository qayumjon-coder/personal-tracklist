---
description: Serverless Deployment - Supabase + Vercel
---

# 🚀 Serverless Deployment Guide

Bu qo'llanma loyihangizni **Supabase** (Database + Storage) va **Vercel** (Frontend) ga deploy qilish uchun.

**Backend server kerak emas!** ✨

---

## 📋 Tayyorgarlik

### Kerakli Accountlar:
1. **Supabase** - https://supabase.com (Tekin)
2. **Vercel** - https://vercel.com (Tekin)
3. **GitHub** - Loyihani yuklash uchun

---

## 1️⃣ SUPABASE SETUP (10-15 daqiqa)

### 1.1 Loyiha Yaratish
1. https://supabase.com ga kiring
2. "New Project" tugmasini bosing
3. Loyiha nomini kiriting: `music-playlist`
4. Database parolini yarating va **saqlang**
5. Region tanlang: `Southeast Asia (Singapore)` yoki `Central EU (Frankfurt)`
6. "Create new project" ni bosing (2-3 daqiqa kutish kerak)

### 1.2 Database Jadvalini Yaratish
1. Supabase dashboard da **SQL Editor** ga o'ting
2. Quyidagi SQL ni ishga tushiring:

```sql
-- Songs jadvali yaratish
CREATE TABLE songs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  url TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  duration NUMERIC NOT NULL,
  liked BOOLEAN DEFAULT false,
  lyrics TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) ni o'chirish (public access uchun)
ALTER TABLE songs DISABLE ROW LEVEL SECURITY;

-- Index yaratish (tezroq qidiruv uchun)
CREATE INDEX idx_songs_category ON songs(category);
CREATE INDEX idx_songs_liked ON songs(liked);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
```

### 1.3 Storage Bucket Yaratish
1. Supabase dashboard da **Storage** ga o'ting
2. "Create a new bucket" ni bosing
3. Bucket nomi: `music-files`
4. **Public bucket** ni tanlang (✅ Public)
5. "Create bucket" ni bosing

### 1.4 Storage Policies Sozlash
1. `music-files` bucket ni oching
2. **Policies** tab ga o'ting
3. "New Policy" → "For full customization" ni tanlang
4. Quyidagi policy larni qo'shing:

**Policy 1: Public Read Access**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'music-files' );
```

**Policy 2: Public Upload Access**
```sql
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'music-files' );
```

**Policy 3: Public Delete Access (optional)**
```sql
CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'music-files' );
```

### 1.5 API Keys ni Olish
1. **Settings** → **API** ga o'ting
2. Quyidagilarni **nusxa oling**:
   - `Project URL` (masalan: https://xxxxx.supabase.co)
   - `anon public` key

---

## 2️⃣ FRONTEND NI SOZLASH

### 2.1 Environment Variables
FrontEnd papkasida `.env` fayl yarating:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**MUHIM:** `.env` faylini `.gitignore` ga qo'shing!

### 2.2 Local Test
```bash
cd FrontEnd
npm install
npm run dev
```

Agar hammasi to'g'ri bo'lsa, http://localhost:5173 da loyiha ochiladi!

---

## 3️⃣ GITHUB GA YUKLASH

```bash
# Loyiha root papkasida
git init
git add .
git commit -m "Serverless music player with Supabase"
git branch -M main
git remote add origin https://github.com/sizning-username/music-playlist.git
git push -u origin main
```

**MUHIM:** `.gitignore` da quyidagilar bo'lishi kerak:
```
node_modules/
.env
.env.local
dist/
Backend/
```

---

## 4️⃣ VERCEL GA DEPLOY

### 4.1 Vercel da Loyiha Yaratish
1. https://vercel.com ga kiring
2. "Add New..." → "Project" ni tanlang
3. GitHub repo ni import qiling
4. Quyidagi sozlamalarni kiriting:

**Settings:**
- **Project Name:** `music-playlist`
- **Framework Preset:** `Vite`
- **Root Directory:** `FrontEnd`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 4.2 Environment Variables
Vercel da **Environment Variables** qo'shing:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4.3 Deploy Qilish
"Deploy" ni bosing. 2-3 daqiqa kutish kerak.

Deploy tugagach, sizga URL beriladi: `https://music-playlist.vercel.app`

---

## 5️⃣ TEST QILISH

1. Vercel URL ni oching: `https://music-playlist.vercel.app`
2. Qo'shiq qo'shish funksiyasini sinab ko'ring (Admin page)
3. Audio playback ishlashini tekshiring
4. Metadata edit qilishni sinab ko'ring (Editor page)

---

## 🔧 TROUBLESHOOTING

### Frontend Supabase ga ulanmayapti?
- Browser Console ni tekshiring (F12)
- Environment variables to'g'ri kiritilganini tekshiring
- Supabase URL va Key ni qayta tekshiring

### Audio ijro bo'lmayapti?
- Supabase Storage da fayllar public ekanini tekshiring
- Storage policies to'g'ri sozlanganini tekshiring
- Browser Network tab da fayl yuklanayotganini tekshiring

### Upload ishlamayapti?
- Storage policies (INSERT) mavjudligini tekshiring
- Browser console da xatolarni ko'ring
- Supabase dashboard da Storage logs ni tekshiring

---

## 📊 NARXLAR

- **Supabase:** Tekin (500MB database, 1GB storage, 2GB bandwidth)
- **Vercel:** Tekin (100GB bandwidth/oy)

**Jami: $0/oy** 🎉

---

## ✅ YAKUNIY CHECKLIST

- [ ] Supabase loyihasi yaratildi
- [ ] Database jadvali yaratildi
- [ ] Storage bucket yaratildi va public qilindi
- [ ] Storage policies sozlandi
- [ ] Frontend `.env` fayli to'ldirildi
- [ ] Local test qilindi (npm run dev)
- [ ] GitHub ga yuklandi
- [ ] Vercel ga deploy qilindi
- [ ] Production sayt ishlayapti va test qilindi

---

## 🎉 MUVAFFAQIYAT!

Sizning loyihangiz endi butun dunyo bo'ylab mavjud!

**Frontend URL:** https://music-playlist.vercel.app  
**Database:** Supabase PostgreSQL  
**Storage:** Supabase Storage

**Backend server yo'q, lekin hammasi ishlayapti!** ⚡

---

## 🔄 YANGILANISHLAR

Kelajakda kod o'zgartirsangiz:

```bash
git add .
git commit -m "Your changes"
git push
```

Vercel avtomatik ravishda yangi versiyani deploy qiladi! 🚀
