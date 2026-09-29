const API_BASE = 'http://127.0.0.1:8000/api';
const JOKE_API_URL = 'https://v2.jokeapi.dev/joke/Any';

const jokesContainer = document.getElementById('jokesContainer');
const jokesLoadingElement = document.getElementById('jokesLoading');
const postsContainer = document.getElementById('postsContainer');
const loadingElement = document.getElementById('loading');
const loadPostsBtn = document.getElementById('loadPostsBtn');
const loadPostsXhrBtn = document.getElementById('loadPostsXhrBtn');
const loadJokesBtn = document.getElementById('loadJokesBtn');
const jokeCountInput = document.getElementById('jokeCount');

loadPostsBtn.addEventListener('click', fetchPosts);
loadPostsXhrBtn.addEventListener('click', fetchPostsWithXhr);
loadJokesBtn.addEventListener('click', fetchJokes);

async function fetchJokes() {
    const count = Number(jokeCountInput.value);
    if (!Number.isInteger(count) || count < 1 || count > 10) {
        showJokeError('Choose a number from 1 to 10.');
        return;
    }

    loadJokesBtn.disabled = true;
    loadJokesBtn.textContent = 'Loading...';
    jokesLoadingElement.style.display = 'flex';
    try {
        const response = await fetch(`${JOKE_API_URL}?amount=${count}&safe-mode`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.error) {
            throw new Error(result.message || 'The joke service returned an error.');
        }

        displayJokes(result.jokes || [result]);
    } catch (error) {
        showJokeError(`Error fetching jokes: ${error.message}`);
    } finally {
        jokesLoadingElement.style.display = 'none';
        loadJokesBtn.disabled = false;
        loadJokesBtn.textContent = 'Get jokes';
    }
}

function displayJokes(jokes) {
    jokesContainer.innerHTML = '';

    jokes.forEach(joke => {
        const card = document.createElement('article');
        card.className = 'joke-card';

        const setup = document.createElement('div');
        setup.className = 'joke-setup';
        setup.textContent = joke.setup;

        const punchline = document.createElement('div');
        punchline.className = 'joke-punchline';
        punchline.textContent = joke.delivery || joke.joke || '';

        const details = document.createElement('div');
        details.className = 'joke-id';
        details.textContent = `Joke #${joke.id} · ${joke.category}`;

        if (joke.type === 'single') {
            setup.textContent = joke.joke;
            card.append(setup, details);
        } else {
            card.append(setup, punchline, details);
        }
        jokesContainer.appendChild(card);
    });
}

function showJokeError(message) {
    jokesContainer.innerHTML = '';
    const error = document.createElement('p');
    error.className = 'placeholder error';
    error.textContent = message;
    jokesContainer.appendChild(error);
}

async function fetchPosts() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/posts`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const posts = await response.json();
        displayPosts(posts);
    } catch (error) {
        showError(`Error fetching posts: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function fetchPostsWithXhr() {
    showLoading();

    const request = new XMLHttpRequest();
    request.open('GET', `${API_BASE}/posts`);
    request.setRequestHeader('Accept', 'application/json');

    request.addEventListener('load', () => {
        try {
            if (request.status < 200 || request.status >= 300) {
                throw new Error(`HTTP error! status: ${request.status}`);
            }

            displayPosts(JSON.parse(request.responseText));
        } catch (error) {
            showError(`Error fetching posts: ${error.message}`);
        } finally {
            hideLoading();
        }
    });

    request.addEventListener('error', () => {
        showError('Error fetching posts: Network request failed');
        hideLoading();
    });

    request.send();
}

function displayPosts(posts) {
    postsContainer.innerHTML = '';

    if (posts.length === 0) {
        postsContainer.innerHTML = '<p class="placeholder">No posts found. Create one through Postman first.</p>';
        return;
    }

    posts.forEach(post => {
        const postCard = document.createElement('article');
        postCard.className = 'joke-card';

        const titleElement = document.createElement('div');
        titleElement.className = 'joke-setup';
        titleElement.textContent = post.title;

        const bodyElement = document.createElement('div');
        bodyElement.className = 'joke-punchline';
        bodyElement.textContent = post.body;

        const idElement = document.createElement('div');
        idElement.className = 'joke-id';
        idElement.textContent = `Post ID: ${post.id} | User ID: ${post.user_id}`;

        postCard.appendChild(titleElement);
        postCard.appendChild(bodyElement);
        postCard.appendChild(idElement);

        postsContainer.appendChild(postCard);
    });
}

function showError(message) {
    postsContainer.innerHTML = `<p class="placeholder error">${message}</p>`;
}

function showLoading() {
    loadingElement.style.display = 'flex';
    postsContainer.innerHTML = '';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

// Initial message
window.addEventListener('load', fetchPosts);
