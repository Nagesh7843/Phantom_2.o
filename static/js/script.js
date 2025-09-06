document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const BACKEND_API_BASE_URL = "http://127.0.0.1:5000";

    // --- DOM Element References ---
    const getEl = (id) => document.getElementById(id);

    const mainChatArea = getEl('main-chat-area');
    const chatBody = getEl('chat-body');
    const messagesContainer = getEl('messages-container');
    const emptyStateSuggestions = getEl('empty-state-suggestions');
    const suggestionGrid = getEl('suggestion-grid');
    const chatInput = getEl('chat-input');
    const sendButton = getEl('send-button');
    const sidebar = getEl('sidebar');
    const sidebarContent = getEl('sidebar-content');
    const toolkitMenu = getEl('toolkit-menu');
    const toolkitBtn = getEl('toolkit-btn');
    const chatHistoryList = getEl('chat-history-list');
    const chatTitle = getEl('chat-title');
    const newChatBtn = getEl('new-chat-btn');
    const settingsBtn = getEl('settings-btn'); // Gear icon in header
    const userProfileBtn = getEl('user-profile-btn'); // Button in sidebar
    
    // MODAL IDs
    const settingsModal = getEl('settings-modal');
    const closeSettingsModalBtn = getEl('close-settings-modal-btn');
    const saveSettingsBtn = getEl('save-settings-btn');
    const editProfileModal = getEl('edit-profile-modal');
    const closeEditProfileModalBtn = getEl('close-edit-profile-modal-btn');
    const saveProfileBtn = getEl('save-profile-btn');
    const profileModal = getEl('profile-modal');
    const closeProfileModalBtn = getEl('close-profile-modal-btn');
    const profilePictureInput = getEl('profile-picture-input');
    const profileEditBtn = getEl('profile-edit-btn');
    const profileMemoryBtn = getEl('profile-memory-btn');
    const profileSupportBtn = getEl('profile-support-btn');

    const fileInput = getEl('file-input');
    const themeSelect = getEl('theme-select');
    const voiceSelect = getEl('voice-select');
    const micButton = getEl('mic-button');
    const sidebarToggleBtnHeader = getEl('sidebar-toggle-btn-header');
    const sidebarToggleBtnSidebar = getEl('sidebar-toggle-btn-sidebar');
    const geminiToolkitBtn = getEl('gemini-toolkit-btn');
    const geminiModal = getEl('gemini-modal');
    const closeGeminiModalBtn = getEl('close-gemini-modal-btn');
    const summarizeBtn = getEl('summarize-btn');
    const suggestReplyBtn = getEl('suggest-reply-btn');
    const toneAnalyzerBtn = getEl('tone-analyzer-btn');
    const geminiOutput = getEl('gemini-output');
    const searchBarWrapper = getEl('search-bar-wrapper');
    const cameraModal = getEl('camera-modal');
    const closeCameraBtn = getEl('close-camera-btn');
    const cameraStreamEl = getEl('camera-stream');
    const cameraCaptureCanvas = getEl('camera-capture-canvas');
    const captureBtn = getEl('capture-btn');
    const activeToolIndicator = getEl('active-tool-indicator');
    const imagePreviewContainer = getEl('image-preview-container');
    const imagePreview = getEl('image-preview');
    const removeImageBtn = getEl('remove-image-btn');
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.innerHTML = `<div class="text-center p-4 text-gray-400">Thinking...</div>`;
    loadingIndicator.style.display = 'none';
    if (messagesContainer) {
        messagesContainer.parentNode.insertBefore(loadingIndicator, messagesContainer.nextSibling);
    }

    // --- Global State & Data ---
    let currentSessionId = null;
    let chatHistory = [];
    let availableVoices = [];
    let activeStream = null;
    let activeTool = null;
    let attachedFile = null;
    const synth = window.speechSynthesis;
    const allPrompts = [
        { title: "Explain quantum computing", subtitle: "in simple terms" },
        { title: "Creative birthday ideas", subtitle: "for a 10 year old" },
        { title: "Write a thank-you note", subtitle: "to my interviewer" },
        { title: "HTTP requests in Javascript", subtitle: "show me an example" },
        { title: "Plan a trip to the Alps", subtitle: "on a budget" },
        { title: "Write a short sci-fi story", subtitle: "about a friendly robot" },
        { title: "Healthy meal prep ideas", subtitle: "for a busy week" },
        { title: "How to learn a new language", subtitle: "best methods and tips" }
    ];

    // =====================================================================
    // --- API FUNCTIONS ---
    // =====================================================================
    async function fetchApi(endpoint, options = {}) {
        try {
            const response = await fetch(`${BACKEND_API_BASE_URL}${endpoint}`, options);
            if (options.method === 'DELETE' && response.ok) {
                 return { success: true }; 
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            return null;
        }
    }

    const api = {
        getAllSessions: () => fetchApi('/api/all_sessions'),
        getSessionHistory: (sessionId) => fetchApi(`/api/history/${sessionId}`),
        startNewChat: () => fetchApi('/api/new_chat_session', { method: 'POST' }),
        sendMessage: (payload) => fetchApi('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }),
        renameSession: (sessionId, newTitle) => fetchApi(`/api/session/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle })
        }),
        deleteSession: (sessionId) => fetchApi(`/api/session/${sessionId}`, {
            method: 'DELETE'
        }),
        uploadProfilePicture: (formData) => fetch(`${BACKEND_API_BASE_URL}/api/upload_profile_picture`, {
            method: 'POST',
            body: formData
        })
    };

    // =====================================================================
    // --- UI RENDERING & STATE (Main Chat) ---
    // =====================================================================
    function renderSuggestionPrompts() {
        if (!suggestionGrid) return;
        suggestionGrid.innerHTML = '';
        const shuffled = allPrompts.sort(() => 0.5 - Math.random());
        const selectedPrompts = shuffled.slice(0, 4);
        
        selectedPrompts.forEach(prompt => {
            const button = document.createElement('button');
            button.className = "suggestion-btn bg-gray-700 p-4 rounded-lg hover:bg-gray-600 text-left";
            button.innerHTML = `<h3 class="font-semibold">${prompt.title}</h3><p class="text-sm text-gray-400">${prompt.subtitle}</p>`;
            button.addEventListener('click', () => useSuggestion(`${prompt.title} ${prompt.subtitle}`));
            suggestionGrid.appendChild(button);
        });
    }

    function renderChatHistory(sessionsData, activeSessionId) {
        if (!chatHistoryList) return;
        chatHistoryList.innerHTML = '';
        const actualSessions = sessionsData ? sessionsData.sessions : null;
        if (!Array.isArray(actualSessions) || actualSessions.length === 0) {
            chatHistoryList.innerHTML = '<p class="text-center text-gray-500 text-sm p-4">No chat history.</p>';
            return;
        }
        actualSessions.forEach(session => {
            const isActive = session.session_id === activeSessionId;
            const activeClasses = isActive ? 'bg-gray-700 text-white' : 'hover:bg-gray-700';
            const html = `<div class="group relative">
                <a href="#" data-chat-id="${session.session_id}" class="${activeClasses} flex items-center w-full px-3 py-2 text-sm font-medium rounded-md truncate">${session.title}</a>
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button title="Rename" data-rename-id="${session.session_id}" data-current-title="${session.title}" class="p-1 text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button title="Delete" data-delete-id="${session.session_id}" class="p-1 text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
            </div>`;
            chatHistoryList.innerHTML += html;
        });
    }

    function renderMessages() {
        if (!messagesContainer) return;
        messagesContainer.innerHTML = '';
        if (!Array.isArray(chatHistory)) return;
        
        chatHistory.forEach(msg => {
            const userAvatarSrc = userProfileBtn?.querySelector('img')?.src || `https://placehold.co/40x40/4A5568/E2E8F0?text=U`;
            const messageText = msg.parts && msg.parts[0] ? msg.parts[0].text : '[empty message]';
            const messageHTML = msg.role === 'user'
                ? `<div class="message-bubble flex items-start gap-3 justify-end"><div class="bg-teal-500 text-white p-4 rounded-lg max-w-lg"><p>${messageText}</p></div><img class="user-avatar-img h-10 w-10 rounded-full object-cover" src="${userAvatarSrc}" alt="User Avatar"></div>`
                : `<div class="message-bubble flex items-start gap-3"><img class="h-10 w-10 rounded-full object-cover" src="https://placehold.co/40x40/1F2D37/E2E8F0?text=AI" alt="AI Avatar"><div class="bg-gray-700 p-4 rounded-lg max-w-lg">${messageText}</div></div>`;
            messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        checkChatState();
    }
    
    function checkChatState() {
        if (!chatBody || !messagesContainer || !chatInput || !emptyStateSuggestions) return;
        const messageCount = messagesContainer.querySelectorAll('.message-bubble').length;
        const isEffectivelyEmpty = messageCount === 0 && chatInput.value.length === 0 && !attachedFile;
        if (isEffectivelyEmpty) {
            chatBody.classList.add('is-empty');
            emptyStateSuggestions.classList.remove('hidden');
        } else {
            chatBody.classList.remove('is-empty');
            emptyStateSuggestions.classList.add('hidden');
        }
    }
    
    // =====================================================================
    // --- SPEECH & THEME ---
    // =====================================================================
    function populateVoiceList() {
        if (!voiceSelect) return;
        availableVoices = synth.getVoices();
        const currentVal = voiceSelect.value;
        voiceSelect.innerHTML = '';
        availableVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.name;
            voiceSelect.appendChild(option);
        });
        voiceSelect.value = currentVal;
    }
    
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    function speakText(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceSelect && voiceSelect.value) {
            const selectedVoice = availableVoices.find(voice => voice.name === voiceSelect.value);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        synth.speak(utterance);
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && micButton) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        micButton.addEventListener('click', () => recognition.start());
        recognition.onresult = (event) => {
            if(chatInput) {
                chatInput.value = event.results[0][0].transcript;
                handleSendMessage();
            }
        };
        recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    }

    // =====================================================================
    // --- SETTINGS & PROFILE FUNCTIONS ---
    // =====================================================================
    function applySettings() {
        // Apply Theme
        const selectedTheme = themeSelect.value;
        document.body.className = "bg-gray-800 text-gray-200 flex h-screen antialiased overflow-hidden"; // Reset to base classes
        if (selectedTheme === 'theme-light') {
            // You can define light theme classes here if you create them
        }
        
        // Apply Display Name to all relevant elements
        const displayName = getEl('name-input').value;
        document.querySelectorAll('.user-display-name').forEach(el => {
            el.textContent = displayName;
        });
    }

    async function saveAppSettings() {
        const theme = themeSelect.value;
        const voice = voiceSelect.value;

        try {
            const response = await fetch(`${BACKEND_API_BASE_URL}/api/update_profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme, voice })
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem('phantom-theme', theme);
                localStorage.setItem('phantom-voice', voice);
                applySettings();
                closeModal(settingsModal);
                alert('Settings saved successfully!');
            } else {
                alert('Error saving settings: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Could not connect to the server to save settings.');
        }
    }

    async function saveProfileSettings() {
        const displayName = getEl('name-input').value;

        try {
            const response = await fetch(`${BACKEND_API_BASE_URL}/api/update_profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName })
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem('phantom-display-name', displayName);
                applySettings();
                closeModal(editProfileModal);
                alert('Profile saved successfully!');
            } else {
                alert('Error saving profile: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            alert('Could not connect to the server to save profile.');
        }
    }


    function loadSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-dark';
        const voice = localStorage.getItem('phantom-voice');
        const name = localStorage.getItem('phantom-display-name');

        if(themeSelect) themeSelect.value = theme;
        if (name && getEl('name-input')) {
            getEl('name-input').value = name;
        }
        
        const voiceInterval = setInterval(() => {
            if (availableVoices.length) {
                if (voice && voiceSelect) voiceSelect.value = voice;
                clearInterval(voiceInterval);
            }
        }, 100);

        applySettings();
    }
    
    async function handleProfilePictureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profile_picture', file);

        try {
            const response = await api.uploadProfilePicture(formData);
            const result = await response.json();

            if (response.ok) {
                updateAllUserAvatars(result.picture_url);
                alert('Profile picture updated!');
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Failed to upload profile picture:', error);
            alert('Could not connect to the server to upload the image.');
        }
    }

    function updateAllUserAvatars(newUrl) {
        document.querySelectorAll('.user-avatar-img').forEach(img => {
            img.src = newUrl;
        });
    }

    // =====================================================================
    // --- EVENT HANDLERS (Main Chat & History) ---
    // =====================================================================
    async function handleSendMessage(parts) {
        let messageParts = parts;
        if (!messageParts) {
            const messageText = chatInput.value.trim();
            if (messageText === '' && !attachedFile) return;
            messageParts = [];
            if (attachedFile) {
                const imageBase64 = await convertFileToBase64(attachedFile);
                messageParts.push({
                    inlineData: {
                        mimeType: attachedFile.type,
                        data: imageBase64.split(',')[1]
                    }
                });
            }
            if (messageText) {
                messageParts.push({ text: messageText });
            }
        }
        
        if (activeTool) {
            const textPart = messageParts.find(p => p.text);
            if (textPart) {
                textPart.text = `Act as a ${activeTool}. ${textPart.text}`;
            } else {
                messageParts.push({ text: `Act as a ${activeTool}.` });
            }
        }

        chatHistory.push({ role: "user", parts: messageParts });
        renderMessages();
        
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }
        removeAttachedFile();
        selectTool(null);

        const payload = { contents: chatHistory, session_id: currentSessionId };
        loadingIndicator.style.display = 'block';
        const result = await api.sendMessage(payload);
        loadingIndicator.style.display = 'none';
        
        let modelResponseText = "Sorry, something went wrong.";
        if (result && result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            modelResponseText = result.candidates[0].content.parts[0].text;
        } else if (result && result.error?.message) {
            modelResponseText = result.error.message;
        }
        
        chatHistory.push({ role: "model", parts: [{ text: modelResponseText }] });
        renderMessages();
        speakText(modelResponseText);
        
        const sessions = await api.getAllSessions();
        if (sessions) renderChatHistory(sessions, currentSessionId);
    }

    async function loadChat(sessionId) {
        if (!messagesContainer || !loadingIndicator) return;
        messagesContainer.innerHTML = '';
        loadingIndicator.style.display = 'block';
        
        const data = await api.getSessionHistory(sessionId);
        chatHistory = data ? data.history : [];
        currentSessionId = sessionId;

        loadingIndicator.style.display = 'none';
        renderMessages();
        
        const sessionsData = await api.getAllSessions();
        if (sessionsData) {
            renderChatHistory(sessionsData, currentSessionId);
            const selectedSession = sessionsData.sessions.find(s => s.session_id === sessionId);
            if (chatTitle && selectedSession) chatTitle.textContent = selectedSession.title;
        }
    }

    async function handleNewChat() {
        const data = await api.startNewChat();
        if (data && data.session_id) {
            currentSessionId = data.session_id;
            chatHistory = [];
            renderMessages();
            renderSuggestionPrompts();
            if (chatTitle) chatTitle.textContent = "New Chat";
            const sessions = await api.getAllSessions();
            if (sessions) renderChatHistory(sessions, currentSessionId);
        }
    }

    async function handleRenameSession(sessionId, currentTitle) {
        const newTitle = prompt("Enter a new name for the chat:", currentTitle);
        if (newTitle && newTitle.trim() !== '' && newTitle !== currentTitle) {
            const result = await api.renameSession(sessionId, newTitle.trim());
            if (result) {
                const sessions = await api.getAllSessions();
                renderChatHistory(sessions, currentSessionId);
                if (sessionId === currentSessionId && chatTitle) {
                    chatTitle.textContent = newTitle.trim();
                }
            } else {
                alert('Failed to rename session.');
            }
        }
    }

    async function handleDeleteSession(sessionId) {
        if (confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
            const result = await api.deleteSession(sessionId);
            if (result) {
                if (sessionId === currentSessionId) {
                    await handleNewChat();
                } else {
                    const sessions = await api.getAllSessions();
                    renderChatHistory(sessions, currentSessionId);
                }
            } else {
                alert('Failed to delete session.');
            }
        }
    }
    
    function toggleSidebar() {
        if(sidebar && sidebarContent) {
            sidebar.classList.toggle('w-64');
            sidebar.classList.toggle('w-0');
            sidebarContent.classList.toggle('hidden');
        }
    }

    function useSuggestion(text) {
        if(chatInput) {
            chatInput.value = text.replace(/\n/g, ' ').trim();
            handleSendMessage();
        }
    }
    
    // =====================================================================
    // --- GEMINI & CAMERA & TOOLKIT FUNCTIONS ---
    // =====================================================================
    async function handleSummarize() {
        if (!geminiOutput) return;
        geminiOutput.textContent = 'Summarizing...';
        const conversationText = chatHistory.map(msg => `${msg.role}: ${msg.parts[0].text}`).join('\n');
        const prompt = `Please summarize the following conversation:\n\n${conversationText}`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], session_id: currentSessionId };
        const result = await api.sendMessage(payload);
        if (result && result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            geminiOutput.textContent = result.candidates[0].content.parts[0].text;
        } else {
            geminiOutput.textContent = 'Could not generate a summary.';
        }
    }

    async function openCamera() {
        if (!cameraModal) return;
        try {
            activeStream = await navigator.mediaDevices.getUserMedia({ video: true });
            if(cameraStreamEl) cameraStreamEl.srcObject = activeStream;
            openModal(cameraModal);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please ensure you have a webcam and have granted permission.");
        }
    }

    function closeCamera() {
        if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
        }
        if(cameraModal) closeModal(cameraModal);
    }

    function capturePhoto() {
        if (!cameraCaptureCanvas || !cameraStreamEl) return;
        const context = cameraCaptureCanvas.getContext('2d');
        cameraCaptureCanvas.width = cameraStreamEl.videoWidth;
        cameraCaptureCanvas.height = cameraStreamEl.videoHeight;
        context.drawImage(cameraStreamEl, 0, 0, cameraStreamEl.videoWidth, cameraStreamEl.videoHeight);
        cameraCaptureCanvas.toBlob(blob => {
            attachedFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
            showImagePreview(attachedFile);
        }, 'image/jpeg');
        closeCamera();
    }

    function selectTool(toolName) {
        activeTool = toolName;
        if (activeToolIndicator) {
            if (toolName) {
                activeToolIndicator.innerHTML = `<span class="bg-teal-500/20 text-teal-300 text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center">Mode: ${toolName}<button class="ml-1.5 font-bold text-teal-200 hover:text-white" onclick="selectTool(null)">&times;</button></span>`;
                if (chatInput) chatInput.placeholder = `Ask a question in ${toolName} mode...`;
            } else {
                activeToolIndicator.innerHTML = '';
                if (chatInput) chatInput.placeholder = 'Message Phantom AI...';
            }
        }
    }
    window.selectTool = selectTool;

    function showImagePreview(file) {
        if (file && imagePreviewContainer && imagePreview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
            checkChatState();
        }
    }

    function removeAttachedFile() {
        attachedFile = null;
        if (fileInput) fileInput.value = '';
        if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
        if (imagePreview) imagePreview.src = '';
        checkChatState();
    }
    
    function convertFileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // =====================================================================
    // --- VIRTUAL ENVIRONMENT FUNCTIONS ---
    // =====================================================================
    function setupVirtualEnvironment() {
        // ... (existing virtual env code remains here, unchanged)
    }

    // --- Attaching Event Listeners Safely ---
    if (sendButton) sendButton.addEventListener('click', () => handleSendMessage());
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });
        chatInput.addEventListener('input', () => { chatInput.style.height = 'auto'; chatInput.style.height = (chatInput.scrollHeight) + 'px'; checkChatState(); });
    }
    if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
    
    if (chatHistoryList) {
        chatHistoryList.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-chat-id]');
            const renameBtn = e.target.closest('button[data-rename-id]');
            const deleteBtn = e.target.closest('button[data-delete-id]');

            if (link) {
                e.preventDefault();
                loadChat(link.dataset.chatId);
            } else if (renameBtn) {
                e.preventDefault();
                handleRenameSession(renameBtn.dataset.renameId, renameBtn.dataset.currentTitle);
            } else if (deleteBtn) {
                e.preventDefault();
                handleDeleteSession(deleteBtn.dataset.deleteId);
            }
        });
    }

    if (fileInput) fileInput.addEventListener('change', (e) => { 
        if (e.target.files.length > 0) {
            attachedFile = e.target.files[0];
            showImagePreview(attachedFile);
        }
    });
    if (removeImageBtn) removeImageBtn.addEventListener('click', removeAttachedFile);
    
    if (sidebarToggleBtnHeader) sidebarToggleBtnHeader.addEventListener('click', toggleSidebar);
    if (sidebarToggleBtnSidebar) sidebarToggleBtnSidebar.addEventListener('click', toggleSidebar);
    
    if(suggestionGrid) {
        suggestionGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.suggestion-btn');
            if (btn) {
                useSuggestion(btn.innerText);
            }
        });
    }

    function openModal(modal) {
        if (!modal) return;
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('open'), 10);
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('open');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    // Event Listeners for Modals
    if (settingsBtn) settingsBtn.addEventListener('click', () => openModal(settingsModal));
    if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', () => closeModal(settingsModal));
    if (settingsModal) settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeModal(settingsModal); });
    if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveAppSettings);

    if (userProfileBtn) userProfileBtn.addEventListener('click', () => openModal(profileModal));
    if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', () => closeModal(profileModal));
    if (profileModal) profileModal.addEventListener('click', (e) => { if (e.target === profileModal) closeModal(profileModal); });
    
    if (profileEditBtn) profileEditBtn.addEventListener('click', () => {
        closeModal(profileModal);
        openModal(editProfileModal);
    });
    if (closeEditProfileModalBtn) closeEditProfileModalBtn.addEventListener('click', () => closeModal(editProfileModal));
    if (editProfileModal) editProfileModal.addEventListener('click', (e) => { if (e.target === editProfileModal) closeModal(editProfileModal); });
    if(saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfileSettings);
    
    if (profilePictureInput) profilePictureInput.addEventListener('change', handleProfilePictureUpload);
    if (profileMemoryBtn) profileMemoryBtn.addEventListener('click', () => alert("User Memory feature coming soon!"));
    if (profileSupportBtn) profileSupportBtn.addEventListener('click', () => alert("Contact support at support@phantomai.com"));
    
    if (toolkitBtn) toolkitBtn.addEventListener('click', (e) => { e.stopPropagation(); toolkitMenu.classList.toggle('hidden'); });
    if (getEl('tool-file-btn')) getEl('tool-file-btn').addEventListener('click', () => { fileInput.click(); toolkitMenu.classList.add('hidden'); });
    if (getEl('tool-camera-btn')) getEl('tool-camera-btn').addEventListener('click', () => { openCamera(); toolkitMenu.classList.add('hidden'); });
    if (captureBtn) captureBtn.addEventListener('click', capturePhoto);
    if (closeCameraBtn) closeCameraBtn.addEventListener('click', closeCamera);
    
    if (geminiToolkitBtn) geminiToolkitBtn.addEventListener('click', () => openModal(geminiModal));
    if (closeGeminiModalBtn) closeGeminiModalBtn.addEventListener('click', () => closeModal(geminiModal));
    if (geminiModal) geminiModal.addEventListener('click', (e) => { if (e.target === geminiModal) closeModal(geminiModal); });
    if (summarizeBtn) summarizeBtn.addEventListener('click', handleSummarize);
    if (suggestReplyBtn) suggestReplyBtn.addEventListener('click', () => alert('Suggest Replies feature coming soon!'));
    if (toneAnalyzerBtn) toneAnalyzerBtn.addEventListener('click', () => alert('Tone Analyzer feature coming soon!'));

    // --- INITIALIZATION ---
    async function initializeApp() {
        loadSettings(); 
        populateVoiceList();
        const sessionsData = await api.getAllSessions();
        renderChatHistory(sessionsData, null);
        renderSuggestionPrompts();
        if (sessionsData && sessionsData.sessions && sessionsData.sessions.length > 0) {
            await loadChat(sessionsData.sessions[0].session_id);
        } else {
            await handleNewChat();
        }
        checkChatState();
        
        setupVirtualEnvironment();
    }
    
    initializeApp();
});

