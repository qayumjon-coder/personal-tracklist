---
description: Loyihani Cloud ga Deploy Qilish (Supabase + Vercel + Render)
---

# 🚀 Cloud Deployment - To'liq Qo'llanma

Bu qo'llanma loyihangizni **Supabase** (Database + Storage), **Vercel** (Frontend), va **Render** (Backend) ga deploy qilish uchun.

---

## 📋 Tayyorgarlik

### Kerakli Accountlar:
1. **Supabase** - https://supabase.com (Tekin)
2. **Vercel** - https://vercel.com (Tekin)
3. **Render** - https://render.com (Tekin)
4. **GitHub** - Loyihani yuklash uchun

---

## 1️⃣ SUPABASE SETUP

### 1.1 Loyiha Yaratish
1. https://supabase.com ga kiring
2. "New Project" tugmasini bosing
3. Loyiha nomini kiriting: `music-playlist`
4. Database parolini yarating va **saqlang** (kerak bo'ladi!)
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

### 1.5 API Keys ni Olish
1. **Settings** → **API** ga o'ting
2. Quyidagilarni **nusxa oling**:
   - `Project URL` (masalan: https://xxxxx.supabase.co)
   - `anon public` key

---

## 2️⃣ BACKEND NI O'ZGARTIRISH

### 2.1 Supabase Client O'rnatish
```bash
cd Backend
npm install @supabase/supabase-js dotenv
```

### 2.2 Environment Variables Yaratish
Backend papkasida `.env` fayl yarating:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
```

**MUHIM:** `.env` faylini `.gitignore` ga qo'shing!

### 2.3 Kodni O'zgartirish
Agent sizga yangi kod yozib beradi. Quyidagi fayllar o'zgaradi:
- `src/config/supabase.ts` (yangi)
- `src/routes/music.routes.ts` (o'zgaradi)
- `src/index.ts` (o'zgaradi)

---

## 3️⃣ FRONTEND NI O'ZGARTIRISH

### 3.1 Environment Variables
FrontEnd papkasida `.env` fayl yarating:

```env
VITE_API_URL=http://localhost:3000
```

Production uchun Vercel da sozlanadi.

### 3.2 API URL ni Dynamic Qilish
Agent sizga `src/config/api.ts` fayl yaratib beradi.

---

## 4️⃣ MAVJUD MA'LUMOTLARNI KO'CHIRISH

### 4.1 Songs.json dan Supabase ga
Agent sizga migration script yozib beradi yoki qo'lda SQL orqali kiritasiz.

### 4.2 Audio va Cover Fayllarni Yuklash
Supabase Storage ga qo'lda yoki script orqali yuklanadi.

---

## 5️⃣ GITHUB GA YUKLASH

```bash
# Loyiha root papkasida
git init
git add .
git commit -m "Initial commit - Cloud ready"
git branch -M main
git remote add origin https://github.com/sizning-username/music-playlist.git
git push -u origin main
```

**MUHIM:** `.gitignore` da quyidagilar bo'lishi kerak:
```
node_modules/
.env
dist/
audio/
covers/
```

---

## 6️⃣ BACKEND NI RENDER GA DEPLOY

### 6.1 Render da Loyiha Yaratish
1. https://render.com ga kiring
2. "New +" → "Web Service" ni tanlang
3. GitHub repo ni ulang
4. Quyidagi sozlamalarni kiriting:

**Settings:**
- **Name:** `music-playlist-api`
- **Region:** `Singapore` yoki `Frankfurt`
- **Branch:** `main`
- **Root Directory:** `Backend`
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Instance Type:** `Free`

### 6.2 Environment Variables Qo'shish
Render dashboard da **Environment** tab ga o'ting:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
```

### 6.3 Deploy Qilish
"Create Web Service" ni bosing. 5-10 daqiqa kutish kerak.

Deploy tugagach, sizga URL beriladi: `https://music-playlist-api.onrender.com`

---

## 7️⃣ FRONTEND NI VERCEL GA DEPLOY

### 7.1 Vercel da Loyiha Yaratish
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

### 7.2 Environment Variables
```
VITE_API_URL=https://music-playlist-api.onrender.com
```

### 7.3 Deploy Qilish
"Deploy" ni bosing. 2-3 daqiqa kutish kerak.

Deploy tugagach, sizga URL beriladi: `https://music-playlist.vercel.app`

---

## 8️⃣ TEST QILISH

1. Vercel URL ni oching: `https://music-playlist.vercel.app`
2. Musiqa ro'yxati ko'rinishi kerak
3. Qo'shiq qo'shish funksiyasini sinab ko'ring
4. Audio playback ishlashini tekshiring

---

## 🔧 TROUBLESHOOTING

### Backend ishlamayapti?
- Render logs ni tekshiring: Dashboard → Logs
- Environment variables to'g'ri kiritilganini tekshiring
- Supabase URL va Key ni qayta tekshiring

### Frontend API ga ulanmayapti?
- Browser Console ni tekshiring (F12)
- CORS xatosi bo'lsa, Backend da `cors()` sozlamalarini tekshiring
- `VITE_API_URL` to'g'ri kiritilganini tekshiring

### Audio ijro bo'lmayapti?
- Supabase Storage da fayllar public ekanini tekshiring
- Storage policies to'g'ri sozlanganini tekshiring
- Browser Network tab da fayl yuklanayotganini tekshiring

---

## 📊 NARXLAR

- **Supabase:** Tekin (500MB database, 1GB storage)
- **Vercel:** Tekin (100GB bandwidth/oy)
- **Render:** Tekin (750 soat/oy, 15 daqiqa inactivity dan keyin uyquga ketadi)

**MUHIM:** Render free plan da service 15 daqiqa ishlatilmasa uyquga ketadi. Birinchi request 30-60 soniya olishi mumkin (cold start).

---

## ✅ YAKUNIY CHECKLIST

- [ ] Supabase loyihasi yaratildi
- [ ] Database jadvali yaratildi
- [ ] Storage bucket yaratildi va public qilindi
- [ ] Backend kodi Supabase ga o'zgartirildi
- [ ] Frontend environment variables sozlandi
- [ ] GitHub ga yuklandi
- [ ] Backend Render ga deploy qilindi
- [ ] Frontend Vercel ga deploy qilindi
- [ ] Sayt ishlayapti va test qilindi

---

## 🎉 MUVAFFAQIYAT!

Sizning loyihangiz endi butun dunyo bo'ylab mavjud!

**Frontend URL:** https://music-playlist.vercel.app  
**Backend API:** https://music-playlist-api.onrender.com

Endi siz loyihani istalgan joydan ochishingiz va ishlatishingiz mumkin! 🚀
