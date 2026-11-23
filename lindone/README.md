# Lindone

Личный архив одного артиста: дискография (синглы, микстейпы, альбомы), визуальный дневник (фото и видео) и непрерывный плеер внизу. Вход только для владельца, всё хранилище приватное.

Стек: Next.js 15 (App Router) · TypeScript strict · Tailwind · Supabase (Postgres, Auth, Storage) · Zustand · Framer Motion · React Three Fiber · ffmpeg.wasm · Vercel.

## Структура

```
app/
  (auth)/login            вход: ссылка или 6-значный код на почту
  (app)/layout.tsx        оболочка: WebGL-фон, навигация, <audio> и плеер — не размонтируются
  (app)/page.tsx          дискография: сетка, фильтр по типу, сортировка
  (app)/releases/…        релиз, создание, редактирование
  (app)/archive/…         лента / сетка, теги, пост
  (app)/upload            загрузка фото и видео
  (app)/memory            «в этот день N лет назад»
  (app)/search            поиск по релизам, трекам и подписям
  api/export              весь архив одним JSON
  auth/confirm, signout   подтверждение ссылки, выход
  media/[bucket]/[...path] приватные файлы: проверка входа → подписанная ссылка
components/
  glass/                  GlassCard, GlassButton, GlassSphere, GlassModal, GlassNav, GlassLens…
  shaders/                фон-шейдер и CSS-фолбэк
  player/                 PlayerProvider (<audio>), PlayerBar, PlayerExpanded, QueueModal
  releases/ archive/ memory/ search/ pwa/ ui/
lib/
  supabase/               клиенты, типы, загрузка в Storage
  audio/                  стор плеера (Zustand), длительность, форматы
  image/resize.ts         обложка 1000×1000 и фото до 2048 px в WebP
  video/ffmpeg.ts         H.264 1080p + постер в браузере
supabase/
  migrations/             схема, RLS, бакеты, поиск, «в этот день»
  templates/magic_link.html
scripts/backup.mjs        бэкап таблиц и файлов
public/                   manifest.json, sw.js, иконки
```

## Локальный запуск

Нужны Node 20+ и Docker.

```bash
npm install
npx supabase start          # Postgres, Auth, Storage, почта на http://127.0.0.1:54324
cp .env.example .env.local  # подставь URL и anon key из вывода `supabase start`, OWNER_EMAIL=owner@lindone.test
npm run dev
```

Письмо с кодом входа приходит в локальный Mailpit: http://127.0.0.1:54324.

Проверки: `npm run lint`, `npm run typecheck`, `npm run build`.

## Деплой

### 1. Supabase

1. Создай проект на [supabase.com](https://supabase.com/dashboard) (регион ближе к тебе).
2. Примени миграции:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   Миграция создаёт таблицы, RLS, функции поиска и четыре приватных бакета: `covers`, `audio`, `media`, `posters`.
3. Назначь владельца — SQL Editor:
   ```sql
   select private.set_owner('твой@email');
   ```
   Только этот адрес сможет войти; любой другой аккаунт база отклонит.
4. Authentication → URL Configuration:
   - Site URL: `https://lindone.com`
   - Redirect URLs: `https://lindone.com/**` (и `https://*.vercel.app/**`, если нужны превью)
5. Authentication → Emails → Magic Link: вставь содержимое `supabase/templates/magic_link.html`. В нём есть и ссылка (`{{ .TokenHash }}`), и код (`{{ .Token }}`) — код нужен, чтобы войти в установленное на iPhone приложение.
6. Authentication → Emails → SMTP: подключи свой SMTP (Resend, Postmark и т. п.). Встроенная почта Supabase шлёт всего несколько писем в час.
7. Storage → Settings: лимит размера файла. На бесплатном тарифе это 50 МБ; на Pro можно поднять и выставить то же число в `NEXT_PUBLIC_MAX_UPLOAD_MB`.

### 2. Vercel

1. Import Project → репозиторий `lindxne/projects`, **Root Directory: `lindone`**, фреймворк Next.js определится сам.
2. Environment Variables (Production и Preview):

   | Переменная | Значение |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `OWNER_EMAIL` | тот же адрес, что в `private.set_owner` |
   | `NEXT_PUBLIC_SITE_URL` | `https://lindone.com` |
   | `NEXT_PUBLIC_MAX_UPLOAD_MB` | `50` (или лимит твоего тарифа) |

   `SUPABASE_SERVICE_ROLE_KEY` на Vercel **не добавляй** — он нужен только скрипту бэкапа.
3. Deploy.

### 3. Домен lindone.com

1. Vercel → Project → Settings → Domains → добавь `lindone.com` и `www.lindone.com` (редирект `www` → корень).
2. У регистратора домена:
   - `A` запись `@` → `76.76.21.21`
   - `CNAME` запись `www` → `cname.vercel-dns.com`

   Если Vercel покажет другие значения — используй их. Сертификат выпустится автоматически.
3. Проверь, что Site URL в Supabase и `NEXT_PUBLIC_SITE_URL` равны `https://lindone.com`, и запроси вход.

### 4. Установка на телефон

- iPhone: Safari → «Поделиться» → «На экран Домой». Входи по коду из письма.
- Android / desktop Chrome: кнопка «Установить» появится сама.

## Бэкап

Раз в месяц:

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service_role> npm run backup -- /path/to/disk
```

Скрипт кладёт в `<папка>/<дата>/` все таблицы в JSON и все файлы из Storage. Service role key обходит RLS — храни его только у себя.

Быстрый экспорт без файлов: меню «+» → «Экспорт архива (JSON)» (`/api/export`) — метаданные и ссылки на скачивание, действующие 7 дней.

## Как это устроено

- **Приватность.** В таблице `private.owner` один адрес. RLS на всех таблицах и бакетах пускает только его; триггер на `auth.users` не даёт создать чужой аккаунт. В базе хранятся постоянные пути вида `/media/<bucket>/<path>`, а короткоживущая подписанная ссылка выдаётся при каждом запросе.
- **Плеер.** `<audio>` и стор живут в `app/(app)/layout.tsx`, поэтому музыка не прерывается при переходах. Очередь, позиция и громкость сохраняются в `localStorage`.
- **Видео.** Конвертация идёт в браузере (ffmpeg.wasm): любой ролик до 60 секунд превращается в H.264/AAC MP4 не больше 1080p, из него же берётся постер. HEVC с iPhone в хранилище не попадает. Уже подходящий H.264 только переупаковывается.
- **Лента.** Пагинация по курсору `(created_at, id)`, без `offset`.
- **Стекло.** Каждый стеклянный элемент — CSS (`backdrop-filter`, блики, хроматический край). Поверх, если есть WebGL, — шейдерный фон и преломляющие линзы на плеере, навигации и модалках (на телефоне — только на плеере, 30 fps). Без WebGL остаётся CSS-версия.
