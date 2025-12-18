# Loyihani Sayt Sifatida Chiqarish (Deployment)

Ushbu loyiha **Frontend** (React) va **Backend** (Node.js/Express) dan iborat. Hozirgi holatda backend fayllarni (musiqa, rasmlar, database) **lokal papkalarda** saqlaydi. Shu sababli, uni internetga chiqarishning eng oson va to'g'ri yo'li — **VPS (Virtual Private Server)** ishlatishdir.

## 1. Tayyorgarlik (Build)

Avval loyihani "production" holatiga keltirishimiz kerak.

### Frontend
1. `FrontEnd` papkasiga kiring.
2. `npm run build` komandasini bering.
3. Bu `dist` papkasini yaratadi. Bu papka ichidagi fayllar sizning tayyor saytingizdir.

### Backend
1. `Backend` papkasida `npm run build` (agar TS bo'lsa) qiling.
2. Agar TypeScript ishlatayotgan bo'lsangiz, `dist` yoki `build` papkasi hosil bo'ladi.

---

## 2. Hosting Tanlash

### Variant A: VPS (Tavsiya etiladi)
Bu variantda siz **Ubuntu** server sotib olasiz (oyiga ~$5). Bu server xuddi sizning kompyuteringizdek ishlaydi va fayllaringizni saqlab turadi.

**Provayderlar:**
- DigitalOcean
- Linode
- Hetzner
- Timeweb (O'zbekistonda tezroq ishlashi mumkin)

**Qadamlar:**
1. Server sotib oling va SSH orqali ulaning.
2. Node.js va Nginx o'rnating.
3. Loyihani serverga yuklang (GitHub orqali yoki FTP).
4. `pm2` yordamida Backendni ishga tushiring: `pm2 start dist/index.js`.
5. Nginx ni sozlab, Frontend (`dist` papkasi) va Backend (`localhost:3000`) o'rtasidagi bog'liqlikni yarating.

### Variant B: Vercel + Render (Murakkabroq)
Bu variant tekin bo'lishi mumkin, lekin **fayllar o'chib ketish xavfi bor**, chunki backenddagi `songs.json` va `audio` papkalar vaqtinchalik bo'ladi.
Buning uchun kodni o'zgartirish kerak:
- Rasmlar/Musiqalar -> **AWS S3** yoki **Cloudinary** ga yuklanishi kerak.
- Database (`json` o'rniga) -> **MongoDB Atlas** yoki **Supabase** ga o'tishi kerak.

---

## 3. Eng Oson Yo'l (VPS uchun qisqa reja)

Agar siz loyihani hozirgi holatida o'zgartirmasdan chiqarmoqchi bo'lsangiz:

1. **GitHub** ga loyihani yuklang.
2. Bitta **Ubuntu 22.04** server oling.
3. Serverda quyidagi komandalarni bering:
   ```bash
   # Node.js o'rnatish
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx

   # Loyihani ko'chirib olish
   git clone <sizning-repo-urlingiz>
   cd MusicPlaylist
   
   # Frontendni qurish
   cd FrontEnd
   npm install
   npm run build
   
   # Backendni qurish va yurgizish
   cd ../Backend
   npm install
   npm run build
   npm install -g pm2
   pm2 start dist/index.js --name "music-api"
   ```

---

## 4. MongoDB yoki Supabase Ishlatsak nima bo'ladi?

Siz so'ragandek, **MongoDB** yoki **Supabase** ga o'tish loyihani **"Cloud"** (Bulutli) qilishga yordam beradi. Bu juda yaxshi fikr!

### Farqi nimada?

| Xususiyat | Hozirgi (Lokal JSON) | Bulutli (MongoDB/Supabase) |
| :--- | :--- | :--- |
| **Ma'lumotlar** | `songs.json` faylida turadi. | Internetdagi bazada turadi. |
| **Xavfsizlik** | Server o'chsa, saqlanadi. Server buzilsa, o'chib ketishi mumkin. | Server buzilsa ham ma'lumot bulutda omon qoladi. |
| **Deploy** | Faqat **VPS** (Disk bor server) kerak. | Vercel, Render kabi tekin joylarga qo'ysa bo'ladi (qisman). |

### Muhim Nuqta: Fayllar (MP3 va Rasmlar)

Agar biz Database ni o'zgartirsak, `database` muammosi hal bo'ladi, lekin **MP3 va Rasmlar** hali ham kompyuterning papkasida (`uploads`) qolib ketadi.
Vercel yoki Render kabi tekin hostinglar papkaga fayl yozishga ruxsat bermaydi (yoki tez o'chirib yuboradi).

Shuning uchun, agar to'liq zamonaviy (Serverless) qilmoqchi bo'lsak, 2 ta narsani o'zgartirish kerak:

1. **Ma'lumotlar (Data):** `songs.json` o'rniga **Supabase Database (PostgreSQL)** yoki **MongoDB**.
2. **Fayllar (Storage):** `audio/` papkasi o'rniga **Supabase Storage**, **AWS S3** yoki **Cloudinary**.

### Tavsiya: Supabase

**Supabase** eng qulay variant, chunki u yerda ham **Database**, ham **File Storage** bor.

**Migratsiya qilish rejasi:**
1. Supabase da loyiha ochish.
2. `songs` jadvalini yaratish.
3. Storage da `music-files` buketini yaratish.
4. Backend kodini o'zgartirish:
   - `fs.writeFileSync` (JSON) o'rniga Supabase ga ulanish.
   - `multer` (Lokal saqlash) o'rniga faylni to'g'ridan-to'g'ri Supabase Storage ga yuklash.

Agar shuni xohlasangiz, loyihani **Supabase** ga o'tkazib bera olaman. Bu biroz vaqt oladi, lekin natijada saytni bemalol **Vercel** (Frontend) va **Render/Railway** (Backend) ga tekin joylashtira olasiz.
4. **Nginx** ni sozlab, 80-portga kelgan so'rovlarni Frontendga, `/api` bilan kelganlarni Backendga yo'naltiring.

Hozircha shu usul eng barqaror ishlaydi.
