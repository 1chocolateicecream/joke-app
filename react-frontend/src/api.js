const API_BASE = (
    import.meta.env.VITE_LARAVEL_API_URL || 'http://127.0.0.1:8000/api'
).replace(/\/$/, '')
export const API_ROOT = API_BASE.replace(/\/api$/, '')

async function request(path, { token, body, ...options } = {}) {
    const headers = new Headers(options.headers)
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
    headers.set('Accept', 'application/json')

    if (body !== undefined && !isFormData) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })
    const responseText = await response.text()
    const data = responseText ? JSON.parse(responseText) : null

    if (!response.ok || data?.errors) {
        const validationMessage = data?.errors
            ? Object.values(data.errors).flat().join(' ')
            : ''
        throw new Error(validationMessage || data?.message || `Request failed (${response.status})`)
    }

    return data
}

export const listPosts = ({ scope, ...options } = {}) => request(`/posts${scope === 'following' ? '?scope=following' : ''}`, options)
export const login = (values) => request('/login', { method: 'POST', body: values })
export const register = (values) => request('/register', { method: 'POST', body: values })
export const logout = (token) => request('/logout', { method: 'POST', token })
function postForm(values) {
    const form = new FormData()
    for (const [key, value] of values.entries()) {
        if (key === 'image' && (!(value instanceof File) || value.size === 0)) continue
        form.append(key, value)
    }
    return form
}

export const createPost = (token, values) => request('/posts', { method: 'POST', token, body: postForm(values) })
export const updatePost = (token, id, values) => {
    const form = postForm(values)
    form.append('_method', 'PUT')
    return request(`/posts/${id}`, { method: 'POST', token, body: form })
}
export const deletePost = (token, id) => request(`/posts/${id}`, { method: 'DELETE', token })
export const likePost = (token, id) => request(`/posts/${id}/like`, { method: 'PUT', token })
export const unlikePost = (token, id) => request(`/posts/${id}/like`, { method: 'DELETE', token })
export const repostPost = (token, id) => request(`/posts/${id}/repost`, { method: 'PUT', token })
export const unrepostPost = (token, id) => request(`/posts/${id}/repost`, { method: 'DELETE', token })
export const getProfile = (userId, token, options = {}) => request(`/users/${userId}/profile`, { ...options, token })
export const updateProfile = (token, formData) => {
    formData.append('_method', 'PATCH')
    return request('/profile', { method: 'POST', token, body: formData })
}
export const listComments = (postId, options = {}) => request(`/posts/${postId}/comments`, options)
export const createComment = (token, postId, content) => request(`/posts/${postId}/comments`, { method: 'POST', token, body: { content } })
export const deleteComment = (token, postId, commentId) => request(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE', token })
export const listMembers = (query = '', options = {}) => request(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`, options)
export const followUser = (token, userId) => request(`/users/${userId}/follow`, { method: 'PUT', token })
export const unfollowUser = (token, userId) => request(`/users/${userId}/follow`, { method: 'DELETE', token })
export const listNotifications = (token) => request('/notifications', { token })
export const markNotificationRead = (token, id) => request(`/notifications/${id}`, { method: 'PATCH', token })
export const markAllNotificationsRead = (token) => request('/notifications/read-all', { method: 'PATCH', token })
export const listPostLikes = (postId) => request(`/posts/${postId}/likes`)

export async function listJokes(amount) {
    const response = await fetch(
        `https://v2.jokeapi.dev/joke/Any?amount=${amount}&safe-mode`,
    )
    const data = await response.json()

    if (!response.ok || data.error) {
        throw new Error(data.message || `Joke service failed (${response.status})`)
    }

    const jokes = data.jokes || [data]
    return jokes.map((joke) => ({
        id: joke.id,
        category: joke.category,
        type: joke.type,
        setup: joke.type === 'single' ? joke.joke : joke.setup,
        delivery: joke.type === 'single' ? '' : joke.delivery,
    }))
}
