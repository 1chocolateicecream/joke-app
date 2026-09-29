# API Testing Guide

The project uses two REST APIs: JokeAPI for public jokes and the local Laravel API for posts.

## Test jokes in Postman

Import `postman_collection.json`, or create a GET request manually:

```text
https://v2.jokeapi.dev/joke/Any?amount=5&safe-mode
```

Change the `amount` query parameter to `1`, `3`, `5`, or `10` to request different numbers of jokes. `safe-mode` filters out unsafe jokes. A successful response has `error: false`, an `amount`, and a `jokes` array.

## Test Laravel posts in Postman

Start the backend in one terminal:

```bash
cd ../laravel-api
php artisan serve --host=127.0.0.1 --port=8000
```

List posts:

```text
GET http://127.0.0.1:8000/api/posts
```

To create a post, register a user first:

```text
POST http://127.0.0.1:8000/api/register
Content-Type: application/json
Accept: application/json
```

```json
{
  "name": "Postman User",
  "email": "postman@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

Copy the returned token, then send:

```text
POST http://127.0.0.1:8000/api/posts
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
Accept: application/json
```

```json
{
  "title": "Test post",
  "body": "Created with Postman"
}
```

Call `GET /api/posts` again to see the new post.

## Check the browser app

Start the frontend in another terminal:

```bash
cd ../joke-app
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080`. **Get jokes** loads JokeAPI data with `fetch()` and renders it into HTML. The two Laravel buttons load the same posts endpoint using `fetch()` and `XMLHttpRequest`. All updates happen without a page reload.
