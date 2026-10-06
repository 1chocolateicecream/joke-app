# ВКустах: AJAX and REST APIs

Vanilla JavaScript projekts, kas ielādē nejaušas šutkas no Official Joke API un Laravel posts no lokāla backend, neielādējot lapu no jauna.

## 📋 Projekta Apraksts

Šis projekts izmanto divus REST API:
- **JokeAPI** (`https://v2.jokeapi.dev`) - nejaušas, drošā režīma šutkas ar query parametru `amount` no 1 līdz 10
- **Laravel API** (`http://127.0.0.1:8000/api/posts`) - posts no lokālā backend projekta `../laravel-api`
- **Tehnika**: AJAX ar `fetch()`/async-await un `XMLHttpRequest`
- **Frontend**: Vanilla HTML, CSS, JavaScript

## 🚀 Abu projektu palaišana

Backend terminalī:

```bash
cd ../laravel-api
php artisan serve --host=127.0.0.1 --port=8000
```

Frontend citā terminalī:

```bash
cd ../joke-app
python3 -m http.server 8080
```

Atveriet `http://127.0.0.1:8080`. Jokus var pieprasīt ar pogu “Get jokes”, izvēloties skaitu no 1 līdz 10. Laravel posts automātiski ielādējas lapas atvēršanas brīdī; salīdziniet `fetch()` un `XMLHttpRequest` ar abām posts pogām.

Joke API piemērs: `https://v2.jokeapi.dev/joke/Any?amount=5&safe-mode`.

## 🚀 Ņemšanas sākšana

1. Atveriet `index.html` pārlūkprogrammā
2. Noklikšķiniet uz jebkuras pogas, lai ielādētu šutkas
3. Dati tiek ielādēti bez lapas pārlādes

## 📝 API Endpoints

### 1. Viena nejauša šutka
```
GET https://official-joke-api.appspot.com/random_joke
```

**Response:**
```json
{
  "type": "general",
  "setup": "Did you know crocodiles could grow up to 15 feet?",
  "punchline": "But most just have 4.",
  "id": 101
}
```

### 2. Vairākas nejauša šutkas
```
GET https://official-joke-api.appspot.com/jokes/random?count=5
```

**Response:**
```json
[
  {
    "type": "general",
    "setup": "...",
    "punchline": "...",
    "id": 101
  },
  ...
]
```

## 🔧 Testēšana ar Postman

### Postman testēšanas soļi:

1. **Ievadiet URL**: `https://official-joke-api.appspot.com/random_joke`
2. **Metode**: GET
3. **Nosūtīt** → Redzēsiet JSON atbildi

### Query parametru testēšana:

| URL | Apraksts |
|-----|----------|
| `/random_joke` | Viena nejauša šutka |
| `/jokes/random?count=1` | 1 šutka |
| `/jokes/random?count=5` | 5 šutkas |
| `/jokes/random?count=10` | 10 šutkas |

## 💻 DOM Manipulācijas

Projekts izmanto šādas DOM manipulācijas:

```javascript
// Elementa izveide
const jokeCard = document.createElement('div');

// Klases pievienošana
jokeCard.className = 'joke-card';

// Teksta iestatīšana
setupElement.textContent = `Setup: ${joke.setup}`;

// Bērna elementa pievienošana
jokeCard.appendChild(setupElement);

// Container notīrīšana
jokesContainer.innerHTML = '';

// Elementa stila maiņa
loadingElement.style.display = 'block';
```

## 🎨 Funkcionalitāte

- ✅ **AJAX Fetch** - Asinhronie pieprasījumi bez lapas pārlādes
- ✅ **DOM Manipulācijas** - Dinamiska satura rādīšana
- ✅ **Error Handling** - Kļūdu apstrāde
- ✅ **Loading State** - Ielādes stāvokļa rādīšana
- ✅ **Responsive Design** - Darbojas uz visiem ekrāniem

## 📂 Failu Struktūra

```
joke-app/
├── index.html       # HTML struktūra
├── style.css        # Stili un animācijas
├── script.js        # JavaScript AJAX loģika
└── README.md        # Dokumentācija
```

## 🔍 JavaScript Kods

### Fetch funkcija
```javascript
async function fetchSingleJoke() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/random_joke`);
        const joke = await response.json();
        displayJokes([joke]);
    } catch (error) {
        showError(`Error: ${error.message}`);
    } finally {
        hideLoading();
    }
}
```

### DOM Manipulācija
```javascript
function displayJokes(jokes) {
    jokesContainer.innerHTML = '';
    jokes.forEach(joke => {
        const jokeCard = document.createElement('div');
        jokeCard.className = 'joke-card';
        // ... add content
        jokesContainer.appendChild(jokeCard);
    });
}
```

## 📌 Galvenie Aspekti

1. **REST API** - Vienkāršs GET pieprasījums bez autentifikācijas
2. **AJAX bez lapas pārlādes** - Fetch API asinhronie pieprasījumi
3. **DOM API** - Dinamiskas HTML ģenerācijas
4. **Error Handling** - Try-catch bloks un lietotāja feedback
5. **Responsive UI** - CSS Grid un Flexbox

---
**Izveidots Vanilla JavaScript** - Nav ārējās bibliotēkas atkarības 🎉
