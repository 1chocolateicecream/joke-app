# ВКустах: React frontend

Bird-themed, VK-inspired React frontend for the Laravel REST API in `../laravel-api`, with a separate JokeAPI tab.

## Run locally

Start Laravel in one terminal:

```bash
cd ../laravel-api
php artisan migrate
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000
```

Start this frontend in another terminal:

```bash
cd ../joke-app/react-frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The default Laravel API URL is `http://127.0.0.1:8000/api`. To override it, copy `.env.example` to `.env.local` and change `VITE_LARAVEL_API_URL`.

## Features

 - Unique @usernames with legacy account backfill
 - English and Russian interface with remembered language preference
 - Public Laravel posts feed with refresh and loading/error states
 - Author names and persistent likes/reposts backed by Laravel
 - Register and sign in using Laravel Sanctum API tokens
 - Public profiles with editable display name, avatar, bio, and relationship status
 - Eleven common relationship statuses, localized in Russian and English
 - Create, edit, and delete posts owned by the signed-in user
 - Request 1-10 safe random jokes from JokeAPI
 - Play audio files selected from the local device; audio is not uploaded
 - Responsive classic information-site styling
