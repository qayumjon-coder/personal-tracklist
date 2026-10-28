# Player Sahifasi Uchun "Cyber Command Palette" (Ctrl+K Qidiruv) — Reja va Eslatma

> **Holat:** Kelgusi bosqich uchun rejalashtirilgan (Roadmap)  
> **Konsept:** Admin panelda muvaffaqiyatli joriy etilgan va sinovdan o'tgan `Ctrl+K` Cyberpunk Command Palette qidiruv tizimini asosiy Player sahifasiga (`FrontEnd/src/pages/Player.tsx` yoki `FrontEnd/src/App.tsx`) moslashtirish.

---

## 1. Asosiy Maqsad

Foydalanuvchi qayerda bo'lishidan qat'i nazar:
- Klaviatura orqali **`Ctrl+K`** (yoki Mac'da **`Cmd+K`**) bosganda,
- Yoki yuqori paneldagi **`[ 🔍 Qidiruv...  Ctrl+K ]`** tugmasini bosganda,
ekranda kiber-shaffof fonli, neon hoshiyali va yorqin qidiruv oynasi (Command Palette) ochiladi.

---

## 2. Player Sahifasidagi Maxsus Imkoniyatlar (UX/UI)

Admin paneldagidan farqli o'laroq, Player sahifasida quyidagi audio va pleyer funksiyalari bo'ladi:

1. **Darhol ijro etish (`Enter` yoki 1-bosish):**
   - Qidiruv natijasidagi istalgan musiqani tanlash bilan trek asosiy pleyerda darhol chalinishni boshlaydi.
2. **Navbatga qo'shish ("Play Next" / "Add to Queue"):**
   - Hozirgi chalinayotgan musiqani to'xtatmasdan, keyingi ijro navbatiga qo'shish tugmasi.
3. **Sevimlilarga qo'shish (`Like` / Yurakcha):**
   - Qidiruv natijasidan chiqmasdan musiqani yoqtirganlar ro'yxatiga qo'shish/olib tashlash.
4. **Matn (Lyrics) tezkor ko'rish:**
   - Qo'shiq so'zlarini darhol tekshirish yoki pleyerda sinxron lirikani ochish.
5. **Klaviatura bilan to'liq boshqaruv:**
   - `↑` va `↓` strelkalari bilan treklarni tanlash.
   - `Enter` — ijro etish.
   - `Esc` — oynani yopish.

---

## 3. Texnik Amalga Oshirish Arxitekturasi

Qayta ishlatiladigan (Reusable) komponent yaratish:
- **Fayl:** `FrontEnd/src/components/CyberCommandPalette.tsx`
- **Props:**
  ```typescript
  interface CyberCommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    tracks: Music[];
    currentTrackId?: number;
    isPlaying?: boolean;
    onPlayTrack: (track: Music) => void;
    onQueueTrack?: (track: Music) => void;
    onToggleLike?: (trackId: number) => void;
    mode: 'player' | 'admin';
  }
  ```
- **Foydasi:** Admin va Player sahifalarida kod takrorlanmaydi, ikkala joyda ham yagona va mukammal sozlangan Cyberpunk animatsiyalari, klaviatura hodisalari va mavzu ranglari avtomatik ishlaydi.

---

## 4. UI Dizayn Xususiyatlari (Skrinshot asosida)

- **Fon:** `bg-[#0a0d14]/95`, `backdrop-blur-xl`, chuqur kiber soya `shadow-[0_0_50px_rgba(var(--accent-rgb),0.35)]`.
- **Hoshiya:** `border-2 border-[var(--accent)]` va neon nur taralishi.
- **Top Bar:** Neon qidiruv belgisi, tozalash tugmasi (`X`) va tezkor `ESC` nishoni.
- **Tavsiyalar:** Bo'sh qidiruvda eng ko'p tinglangan Top 5 treklar tavsiyasi.
- **Footer:** `[Ctrl+K] Qidiruv` • `[ESC] Yopish` • `[↑↓] Tanlash` • `CYBER COMMAND PALETTE`.

---

## 5. Player Uchun "Custom Cyberpunk Category Dropdown" (Janrlar Tanlovi)

Admin panelda yaratilgan qulay va ixcham janrlar dropdown'i asosiy Player sahifasiga (`FrontEnd/src/components/PlayerRightPanel.tsx`) ham taqdim etiladi.

### Hozirgi holat vs Yangi imkoniyatlar:
- **Hozirgi muammo:** Player playlist panelida oddiy tor (`w-32`) menyu mavjud bo'lib, unda qidiruv yo'q, har bir janrda nechta qo'shiq borligi ko'rinmaydi va 30+ janr bo'lsa ro'yxatni axtarish noqulay.
- **Yangi integratsiya:**
  1. **Ichki Mini Qidiruv (Search):** Dropdown ichida qidiruv maydoni bo'lib, bir harf yozish bilan kerakli janr chiqadi.
  2. **Treklar Soni (Count Badges):** Har bir janr yonida nechta musiqa borligi aks etadi va eng ommaboplari avtomatik tepada turadi.
  3. **Tezkor Tugmalar (Quick Filter Pills):** Playlist ustida eng ommabop Top 3-4 janr (`HAMMASI`, `POP`, `AMBIENT`...) tezkor tugmalar shaklida turadi.
  4. **Click-Outside & Escape:** Menyudan tashqariga bosilganda o'z-o'zidan silliq yopiladi.
  5. **Qayta ishlatiluvchi komponent:** `FrontEnd/src/components/CyberCategoryDropdown.tsx` sifatida chiqarilib, Player va Admin ikkalasida ham bir xil qulaylik ta'minlanadi.

---
*Eslatma yaratilgan sana: 2026-10-28*

