document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const BACKEND_API_BASE_URL = "http://127.0.0.1:5000";

    // --- STATE VARIABLES ---
    let currentSessionId = null;
    let chatHistory = [];
    let attachedFile = null;
    let activeTool = null;
    let autoSpeak = false;
    let availableVoices = [];
    let activeStream = null;
    const synth = window.speechSynthesis;

    // --- DOM Element References ---
    const getEl = (id) => document.getElementById(id);

    // Main Layout
    const mainChatArea = getEl('main-chat-area');
    const chatBody = getEl('chat-body');
    const messagesContainer = getEl('messages-container');
    const emptyStateSuggestions = getEl('empty-state-suggestions');
    const suggestionGrid = getEl('suggestion-grid');
    const chatInput = getEl('chat-input');
    const sendButton = getEl('send-button');
    const sidebar = getEl('sidebar');
    const sidebarContent = getEl('sidebar-content');
    const chatHistoryList = getEl('chat-history-list');
    const chatTitle = getEl('chat-title');
    const newChatBtn = getEl('new-chat-btn');
    const loadingIndicator = getEl('loading-indicator'); // Assuming you have <div id="loading-indicator">...</div>
    const sidebarToggleBtnHeader = getEl('sidebar-toggle-btn-header');
    const sidebarToggleBtnSidebar = getEl('sidebar-toggle-btn-sidebar');

    // Toolkits & Inputs
    const toolkitMenu = getEl('toolkit-menu');
    const toolkitBtn = getEl('toolkit-btn');
    const micButton = getEl('mic-button');
    const fileInput = getEl('file-input');
    const imagePreviewContainer = getEl('image-preview-container');
    const imagePreview = getEl('image-preview');
    const removeImageBtn = getEl('remove-image-btn');
    const activeToolIndicator = getEl('active-tool-indicator'); // Assuming you have a div for this

    // Modal Main Buttons
    const settingsBtn = getEl('open-settings-btn');
    const userProfileBtn = getEl('user-profile-btn');
    const geminiToolkitBtn = getEl('gemini-toolkit-btn');

    // All Modals & their content
    const settingsModal = getEl('settings-modal');
    const closeSettingsModal = getEl('close-settings-modal');
    const themeOptions = getEl('theme-options');
    const autoSpeakToggle = getEl('auto-speak-toggle');
    const voiceSelect = getEl('voice-select');
    const saveSettingsBtn = getEl('save-settings-btn');

    const profileModal = getEl('profile-modal');
    const closeProfileModalBtn = getEl('close-profile-modal-btn');
    const profileEditBtn = getEl('profile-edit-btn');
    const profilePictureInput = getEl('profile-picture-input');
    const profileMemoryBtn = getEl('profile-memory-btn');
    const profileSupportBtn = getEl('profile-support-btn');

    const editProfileModal = getEl('edit-profile-modal');
    const closeEditProfileModalBtn = getEl('close-edit-profile-modal-btn');
    const saveProfileBtn = getEl('save-profile-btn');
    const nameInput = getEl('name-input');

    const cameraModal = getEl('camera-modal');
    const closeCameraBtn = getEl('close-camera-btn');
    const captureBtn = getEl('capture-btn');
    const cameraStreamEl = getEl('camera-stream');
    const cameraCaptureCanvas = getEl('camera-capture-canvas');

    const geminiModal = getEl('gemini-modal');
    const closeGeminiModalBtn = getEl('close-gemini-modal-btn');
    const summarizeBtn = getEl('summarize-btn');
    const suggestReplyBtn = getEl('suggest-reply-btn');
    const toneAnalyzerBtn = getEl('tone-analyzer-btn');
    const geminiOutput = getEl('gemini-output');

    // --- UI Interaction Setup ---

    function openModal(modal) {
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // Use flex for centering
        setTimeout(() => modal.classList.add('open'), 10); // For transitions
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('open');
        // Wait for transition to finish before hiding
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }

    // Sidebar Controller
    const setupSidebar = () => {
        if (!sidebar) return;
        const toggle = () => sidebar.classList.toggle('hidden');
        if (sidebarToggleBtnHeader) sidebarToggleBtnHeader.addEventListener('click', toggle);
        if (sidebarToggleBtnSidebar) sidebarToggleBtnSidebar.addEventListener('click', toggle);
    };

    // =====================================================================
    // --- THEME MANAGEMENT ---
    // =====================================================================
    const themes = [
        { id: 'theme-default', name: 'Default' },
        { id: 'theme-dark', name: 'Dark' },
        { id: 'theme-neon', name: 'Neon' },
        { id: 'theme-glassmorphism', name: 'Glass' },
        { id: 'theme-hacker', name: 'Hacker' },
        { id: 'theme-pastel', name: 'Pastel' }
    ];

    function renderThemeOptions() {
        if (!themeOptions) return;
        themeOptions.innerHTML = '';
        const currentTheme = localStorage.getItem('phantom-theme') || 'theme-default';

        themes.forEach(theme => {
            const isChecked = theme.id === currentTheme;
            const optionHtml = `
                <label for="${theme.id}" class="theme-option-label cursor-pointer p-3 border-2 ${isChecked ? 'border-primary-accent' : 'border-color'} rounded-lg hover:border-primary-accent-hover transition-colors">
                    <input type="radio" id="${theme.id}" name="theme" value="${theme.id}" class="sr-only" ${isChecked ? 'checked' : ''}>
                    <span class="text-sm font-medium">${theme.name}</span>
                </label>
            `;
            themeOptions.insertAdjacentHTML('beforeend', optionHtml);
        });

        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                applyTheme(e.target.value);
            });
        });
    }

    function applyTheme(themeId) {
        // Remove all other theme classes before adding the new one
        themes.forEach(theme => {
            document.body.classList.remove(theme.id);
        });

        // Add the new theme class
        document.body.classList.add(themeId);
        localStorage.setItem('phantom-theme', themeId);
        
        // Re-render the options to visually update which one is selected
        if (themeOptions) {
            // A bit of a hack to avoid re-rendering everything, just update classes
            document.querySelectorAll('.theme-option-label').forEach(label => {
                const input = label.querySelector('input');
                if (input.value === themeId) {
                    label.classList.add('border-primary-accent');
                    label.classList.remove('border-color');
                } else {
                    label.classList.remove('border-primary-accent');
                    label.classList.add('border-color');
                }
            });
        }
    }

    // =====================================================================
    // --- STATE & API ---
    // =====================================================================
    async function fetchApi(endpoint, options = {}) {
        try {
            const defaultOptions = {
                headers: { 'Content-Type': 'application/json' },
            };
            const mergedOptions = { ...defaultOptions, ...options };
            if (mergedOptions.body && typeof mergedOptions.body !== 'string') {
                mergedOptions.body = JSON.stringify(mergedOptions.body);
            }

            const response = await fetch(`${BACKEND_API_BASE_URL}${endpoint}`, mergedOptions);
            
            if (options.method === 'DELETE' && response.ok) {
                 return { success: true };
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error! Status: ${response.status}` }));
                throw new Error(errorData.error || `An unknown error occurred.`);
            }
            return response.json();
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            // Optionally show an error to the user
            return null;
        }
    }

    const api = {
        getAllSessions: () => fetchApi('/api/all_sessions'),
        getSessionHistory: (sessionId) => fetchApi(`/api/history/${sessionId}`),
        startNewChat: () => fetchApi('/api/new_chat_session', { method: 'POST' }),
        sendMessage: (payload) => fetchApi('/api/chat', { method: 'POST', body: payload }),
        renameSession: (sessionId, newTitle) => fetchApi(`/api/session/${sessionId}`, { method: 'PUT', body: { title: newTitle } }),
        deleteSession: (sessionId) => fetchApi(`/api/session/${sessionId}`, { method: 'DELETE' }),
        uploadProfilePicture: (formData) => fetch(`${BACKEND_API_BASE_URL}/api/upload_profile_picture`, {
            method: 'POST',
            body: formData // FormData sets its own headers
        })
    };

    // =====================================================================
    // --- UI RENDERING & STATE (Main Chat) ---
    // =====================================================================
    function renderSuggestionPrompts() {
        // FIX: Changed to `let` to allow for dynamic prompts in the future.
        let allPrompts = [
            { title: "Explain", subtitle: "quantum computing in simple terms." },
            { title: "Write a poem", subtitle: "about a robot learning to dream." },
            { title: "Give me ideas", subtitle: "for a 10-day trip to Japan." },
            { title: "Debug this code", subtitle: "for a Python function." }
        ];
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

        const escapeHtml = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const userAvatarEl = document.querySelector('#user-profile-btn .user-avatar-img');
        const userAvatarSrc = userAvatarEl ? userAvatarEl.src : 'https://placehold.co/40x40/4A5568/E2E8F0?text=U';

        chatHistory.forEach((msg, idx) => {
            const id = `msg_${Date.now()}_${idx}`;
            const isUser = msg.role === 'user';
            const avatarSrc = isUser ? userAvatarSrc : 'https://placehold.co/40x40/1F2D37/E2E8F0?text=AI';
            const text = msg.parts && msg.parts[0] ? escapeHtml(msg.parts[0].text).replace(/\n/g, '<br>') : '[empty message]';
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

            const bubbleClasses = `message-bubble flex items-start gap-3 ${isUser ? 'justify-end' : ''}`;

            const actionsHtml = `
                <div class="message-actions mt-1 flex items-center gap-1 text-sm select-none">
                    <button class="action-btn action-speak px-2 py-1 rounded" title="Speak">🔊</button>
                    <button class="action-btn action-copy px-2 py-1 rounded" title="Copy">📋</button>
                    <button class="action-btn action-share px-2 py-1 rounded" title="Share">🔗</button>
                    ${isUser ? `<button class="action-btn action-edit px-2 py-1 rounded" title="Edit" data-msg-index="${idx}">✎</button>` : ''}
                </div>`;

            const msgHtml = `
                <div id="${id}" data-msg-id="${id}" class="${bubbleClasses}">
                    ${isUser ? `
                        <div class="flex flex-col items-end max-w-full">
                            <div class="message-meta text-xs text-gray-400 mb-1">You at ${time}</div>
                            <div class="bg-teal-500 text-white p-4 rounded-lg max-w-lg message-content">${text}</div>
                            ${actionsHtml}
                        </div>
                        <img class="user-avatar-img h-10 w-10 rounded-full object-cover ml-2" src="${avatarSrc}" alt="User Avatar">
                    ` : `
                        <img class="h-10 w-10 rounded-full object-cover mr-2" src="${avatarSrc}" alt="AI Avatar">
                        <div class="flex flex-col max-w-full">
                            <div class="message-meta text-xs text-gray-400 mb-1">Phantom AI at ${time}</div>
                            <div class="bg-gray-700 text-gray-200 p-4 rounded-lg max-w-lg message-content">${text}</div>
                            ${actionsHtml}
                        </div>
                    `}
                </div>`;

            messagesContainer.insertAdjacentHTML('beforeend', msgHtml);
        });

        // Scroll to bottom
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
        if (!voiceSelect || !synth) return;
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
    
    if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    // FIX: Consolidated to a single speakText function
    function speakText(text, force = false) {
        if (!text || !synth) return;
        if (!force && !autoSpeak) return;
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceSelect && voiceSelect.value) {
            const selectedVoice = availableVoices.find(voice => voice.name === voiceSelect.value);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        try {
            synth.cancel();
            synth.speak(utterance);
        } catch (err) { console.warn('speakText error', err); }
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && micButton) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        micButton.addEventListener('click', () => recognition.start());
        recognition.onresult = (event) => {
            if(chatInput) {
                chatInput.value = event.results[0][0].transcript;
                handlePrimaryAction(); // Use the new primary action handler
            }
        };
        recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    }

    // =====================================================================
    // --- SETTINGS & PROFILE FUNCTIONS ---
    // =====================================================================
    function applySettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        applyTheme(theme);
        
        if (nameInput) {
            const displayName = nameInput.value;
            document.querySelectorAll('.user-display-name').forEach(el => {
                el.textContent = displayName;
            });
        }
        if (autoSpeakToggle) {
            autoSpeak = autoSpeakToggle.checked;
        }
    }

    async function saveAppSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = voiceSelect ? voiceSelect.value : '';
        const autoSpeakEnabled = autoSpeakToggle ? autoSpeakToggle.checked : false;

        // Save to localStorage
        localStorage.setItem('phantom-voice', voice);
        localStorage.setItem('phantom-autospeak', autoSpeakEnabled);
        
        // Update app state
        autoSpeak = autoSpeakEnabled;

        // Mock backend save
        console.log('Saving settings:', { theme, voice, autoSpeak });
        
        closeModal(settingsModal);
        // Simple feedback
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveSettingsBtn.textContent = originalText;
        }, 1500);
    }

    async function saveProfileSettings() {
        const displayName = nameInput ? nameInput.value : '';


        const result = await fetchApi('/api/update_profile', {
            method: 'PUT',
            body: { displayName }
        });

        if (result) {
            localStorage.setItem('phantom-display-name', displayName);
            applySettings();
            closeModal(editProfileModal);
            alert('Profile saved successfully!');
        } else {
            alert('Error saving profile.');
        }
    }

    function loadSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = localStorage.getItem('phantom-voice');
        const name = localStorage.getItem('phantom-display-name');
        const autoSpeakEnabled = localStorage.getItem('phantom-autospeak') === 'true';

        applyTheme(theme);
        if (name && nameInput) nameInput.value = name;
        if (autoSpeakToggle) {
            autoSpeakToggle.checked = autoSpeakEnabled;
            autoSpeak = autoSpeakEnabled;
        }
        
        const voiceInterval = setInterval(() => {
            if (availableVoices.length) {
                populateVoiceList(); // Ensure list is populated before setting value
                if (voice && voiceSelect) {
                    voiceSelect.value = voice;
                }
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
    
    // FIX: New function to handle both sending and saving edits
    function handlePrimaryAction() {
        if (!sendButton) return;

        const isSaveMode = sendButton.dataset.saveMode === 'true';
        const editingIndex = sendButton.dataset.editingIndex;

        if (isSaveMode && editingIndex !== undefined) {
            handleSaveEdit(parseInt(editingIndex, 10));
        } else {
            handleSendMessage();
        }
    }

    function handleSaveEdit(index) {
        const newText = chatInput.value.trim();
        if (newText && chatHistory[index] && chatHistory[index].role === 'user') {
            chatHistory[index].parts = [{ text: newText }];
            renderMessages(); // Re-render to show the change
            
            // Optionally, you could re-submit the entire conversation from this point
            // For now, we just update it visually on the client.
        }

        // Reset send button state
        delete sendButton.dataset.saveMode;
        delete sendButton.dataset.editingIndex;
        sendButton.title = 'Send message';
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    async function handleSendMessage(parts) {
        let messageParts = parts;
        if (!messageParts) {
            const messageText = chatInput.value.trim();
            if (messageText === '' && !attachedFile) return;
            messageParts = [];
            if (attachedFile) {
                const imageBase64 = await convertFileToBase64(attachedFile);
                messageParts.push({
                    inlineData: { mimeType: attachedFile.type, data: imageBase64.split(',')[1] }
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

        chatHistory.push({ role: "user", parts: messageParts, timestamp: new Date().toISOString() });
        renderMessages();
        
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }
        removeAttachedFile();
        selectTool(null);

        const payload = { contents: chatHistory, session_id: currentSessionId };
        if(loadingIndicator) loadingIndicator.style.display = 'block';
        const result = await api.sendMessage(payload);
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        
        let modelResponseText = "Sorry, something went wrong.";
        if (result && result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            modelResponseText = result.candidates[0].content.parts[0].text;
        } else if (result && result.error?.message) {
            modelResponseText = result.error.message;
        }
        
        chatHistory.push({ role: "model", parts: [{ text: modelResponseText }], timestamp: new Date().toISOString() });
        renderMessages();
        if (autoSpeak) speakText(modelResponseText);
        
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

    async function switchChatSession(sessionId) {
        if (!sessionId) {
            console.error("switchChatSession called with no sessionId");
            return;
        }
        console.log(`Switching to session: ${sessionId}`);
        currentSessionId = sessionId;
        chatHistory = []; // Clear old messages
        renderMessages(); // Clear the UI
        renderSuggestionPrompts(); // Show suggestions for the new chat
        if (chatTitle) chatTitle.textContent = "New Chat";
    
        // Visually update the history list
        const sessions = await api.getAllSessions();
        if (sessions) {
            renderChatHistory(sessions, currentSessionId);
            // Find the new session's title and update the header
            const newSessionDetails = sessions.sessions.find(s => s.session_id === sessionId);
            if (newSessionDetails && chatTitle) {
                chatTitle.textContent = newSessionDetails.title;
            }
        }
    
        // Now load the actual history for the session
        await loadChat(sessionId);
    }

    async function handleNewChat() {
        console.log('handleNewChat called');
        try {
            const response = await fetch('/api/new_chat_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            console.log('New chat session response:', response);
            if (response.ok) {
                const newSession = await response.json();
                console.log('New session created:', newSession);
                await loadChatHistory();
                await switchChatSession(newSession.session_id);
                // No need to manually add to chatHistory, loadChatHistory will get it
            } else {
                console.error('Failed to create new chat session, status:', response.status);
                const errorData = await response.text();
                console.error('Error data:', errorData);
                showToast('Error creating new chat. Please try again.');
            }
        } catch (error) {
            console.error('Error in handleNewChat:', error);
            showToast('An unexpected error occurred. Please check your connection and try again.');
        }
    };

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
                showToast('Failed to rename session.');
            }
        }
    }

    async function handleDeleteSession(sessionId) {
        showModal(getEl('modal'), {
            title: 'Delete Chat?',
            message: 'Are you sure you want to delete this chat? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                const result = await api.deleteSession(sessionId);
                if (result) {
                    if (sessionId === currentSessionId) {
                        // If we deleted the active chat, start a new one
                        await handleNewChat();
                    } else {
                        // Otherwise, just refresh the list
                        const sessions = await api.getAllSessions();
                        renderChatHistory(sessions, currentSessionId);
                    }
                    showToast('Chat deleted successfully.');
                } else {
                    showToast('Failed to delete session.');
                }
            }
        });
    }
    
    // =====================================================================
    // --- SPEECH & THEME ---
    // =====================================================================
    function populateVoiceList() {
        if (!voiceSelect || !synth) return;
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
    
    if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    // FIX: Consolidated to a single speakText function
    function speakText(text, force = false) {
        if (!text || !synth) return;
        if (!force && !autoSpeak) return;
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceSelect && voiceSelect.value) {
            const selectedVoice = availableVoices.find(voice => voice.name === voiceSelect.value);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        try {
            synth.cancel();
            synth.speak(utterance);
        } catch (err) { console.warn('speakText error', err); }
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && micButton) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        micButton.addEventListener('click', () => recognition.start());
        recognition.onresult = (event) => {
            if(chatInput) {
                chatInput.value = event.results[0][0].transcript;
                handlePrimaryAction(); // Use the new primary action handler
            }
        };
        recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    }

    // =====================================================================
    // --- SETTINGS & PROFILE FUNCTIONS ---
    // =====================================================================
    function applySettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        applyTheme(theme);
        
        if (nameInput) {
            const displayName = nameInput.value;
            document.querySelectorAll('.user-display-name').forEach(el => {
                el.textContent = displayName;
            });
        }
        if (autoSpeakToggle) {
            autoSpeak = autoSpeakToggle.checked;
        }
    }

    async function saveAppSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = voiceSelect ? voiceSelect.value : '';
        const autoSpeakEnabled = autoSpeakToggle ? autoSpeakToggle.checked : false;

        // Save to localStorage
        localStorage.setItem('phantom-voice', voice);
        localStorage.setItem('phantom-autospeak', autoSpeakEnabled);
        
        // Update app state
        autoSpeak = autoSpeakEnabled;

        // Mock backend save
        console.log('Saving settings:', { theme, voice, autoSpeak });
        
        closeModal(settingsModal);
        // Simple feedback
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveSettingsBtn.textContent = originalText;
        }, 1500);
    }

    async function saveProfileSettings() {
        const displayName = nameInput ? nameInput.value : '';


        const result = await fetchApi('/api/update_profile', {
            method: 'PUT',
            body: { displayName }
        });

        if (result) {
            localStorage.setItem('phantom-display-name', displayName);
            applySettings();
            closeModal(editProfileModal);
            alert('Profile saved successfully!');
        } else {
            alert('Error saving profile.');
        }
    }

    function loadSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = localStorage.getItem('phantom-voice');
        const name = localStorage.getItem('phantom-display-name');
        const autoSpeakEnabled = localStorage.getItem('phantom-autospeak') === 'true';

        applyTheme(theme);
        if (name && nameInput) nameInput.value = name;
        if (autoSpeakToggle) {
            autoSpeakToggle.checked = autoSpeakEnabled;
            autoSpeak = autoSpeakEnabled;
        }
        
        const voiceInterval = setInterval(() => {
            if (availableVoices.length) {
                populateVoiceList(); // Ensure list is populated before setting value
                if (voice && voiceSelect) {
                    voiceSelect.value = voice;
                }
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
    
    // FIX: New function to handle both sending and saving edits
    function handlePrimaryAction() {
        if (!sendButton) return;

        const isSaveMode = sendButton.dataset.saveMode === 'true';
        const editingIndex = sendButton.dataset.editingIndex;

        if (isSaveMode && editingIndex !== undefined) {
            handleSaveEdit(parseInt(editingIndex, 10));
        } else {
            handleSendMessage();
        }
    }

    function handleSaveEdit(index) {
        const newText = chatInput.value.trim();
        if (newText && chatHistory[index] && chatHistory[index].role === 'user') {
            chatHistory[index].parts = [{ text: newText }];
            renderMessages(); // Re-render to show the change
            
            // Optionally, you could re-submit the entire conversation from this point
            // For now, we just update it visually on the client.
        }

        // Reset send button state
        delete sendButton.dataset.saveMode;
        delete sendButton.dataset.editingIndex;
        sendButton.title = 'Send message';
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    async function handleSendMessage(parts) {
        let messageParts = parts;
        if (!messageParts) {
            const messageText = chatInput.value.trim();
            if (messageText === '' && !attachedFile) return;
            messageParts = [];
            if (attachedFile) {
                const imageBase64 = await convertFileToBase64(attachedFile);
                messageParts.push({
                    inlineData: { mimeType: attachedFile.type, data: imageBase64.split(',')[1] }
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

        chatHistory.push({ role: "user", parts: messageParts, timestamp: new Date().toISOString() });
        renderMessages();
        
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }
        removeAttachedFile();
        selectTool(null);

        const payload = { contents: chatHistory, session_id: currentSessionId };
        if(loadingIndicator) loadingIndicator.style.display = 'block';
        const result = await api.sendMessage(payload);
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        
        let modelResponseText = "Sorry, something went wrong.";
        if (result && result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            modelResponseText = result.candidates[0].content.parts[0].text;
        } else if (result && result.error?.message) {
            modelResponseText = result.error.message;
        }
        
        chatHistory.push({ role: "model", parts: [{ text: modelResponseText }], timestamp: new Date().toISOString() });
        renderMessages();
        if (autoSpeak) speakText(modelResponseText);
        
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

    async function switchChatSession(sessionId) {
        if (!sessionId) {
            console.error("switchChatSession called with no sessionId");
            return;
        }
        console.log(`Switching to session: ${sessionId}`);
        currentSessionId = sessionId;
        chatHistory = []; // Clear old messages
        renderMessages(); // Clear the UI
        renderSuggestionPrompts(); // Show suggestions for the new chat
        if (chatTitle) chatTitle.textContent = "New Chat";
    
        // Visually update the history list
        const sessions = await api.getAllSessions();
        if (sessions) {
            renderChatHistory(sessions, currentSessionId);
            // Find the new session's title and update the header
            const newSessionDetails = sessions.sessions.find(s => s.session_id === sessionId);
            if (newSessionDetails && chatTitle) {
                chatTitle.textContent = newSessionDetails.title;
            }
        }
    
        // Now load the actual history for the session
        await loadChat(sessionId);
    }

    async function handleNewChat() {
        console.log('handleNewChat called');
        try {
            const response = await fetch('/api/new_chat_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            console.log('New chat session response:', response);
            if (response.ok) {
                const newSession = await response.json();
                console.log('New session created:', newSession);
                await loadChatHistory();
                await switchChatSession(newSession.session_id);
                // No need to manually add to chatHistory, loadChatHistory will get it
            } else {
                console.error('Failed to create new chat session, status:', response.status);
                const errorData = await response.text();
                console.error('Error data:', errorData);
                showToast('Error creating new chat. Please try again.');
            }
        } catch (error) {
            console.error('Error in handleNewChat:', error);
            showToast('An unexpected error occurred. Please check your connection and try again.');
        }
    };

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
                showToast('Failed to rename session.');
            }
        }
    }

    async function handleDeleteSession(sessionId) {
        showModal(getEl('modal'), {
            title: 'Delete Chat?',
            message: 'Are you sure you want to delete this chat? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                const result = await api.deleteSession(sessionId);
                if (result) {
                    if (sessionId === currentSessionId) {
                        // If we deleted the active chat, start a new one
                        await handleNewChat();
                    } else {
                        // Otherwise, just refresh the list
                        const sessions = await api.getAllSessions();
                        renderChatHistory(sessions, currentSessionId);
                    }
                    showToast('Chat deleted successfully.');
                } else {
                    showToast('Failed to delete session.');
                }
            }
        });
    }
    
    // =====================================================================
    // --- SPEECH & THEME ---
    // =====================================================================
    function populateVoiceList() {
        if (!voiceSelect || !synth) return;
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
    
    if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    // FIX: Consolidated to a single speakText function
    function speakText(text, force = false) {
        if (!text || !synth) return;
        if (!force && !autoSpeak) return;
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceSelect && voiceSelect.value) {
            const selectedVoice = availableVoices.find(voice => voice.name === voiceSelect.value);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        try {
            synth.cancel();
            synth.speak(utterance);
        } catch (err) { console.warn('speakText error', err); }
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && micButton) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        micButton.addEventListener('click', () => recognition.start());
        recognition.onresult = (event) => {
            if(chatInput) {
                chatInput.value = event.results[0][0].transcript;
                handlePrimaryAction(); // Use the new primary action handler
            }
        };
        recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    }

    // =====================================================================
    // --- SETTINGS & PROFILE FUNCTIONS ---
    // =====================================================================
    function applySettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        applyTheme(theme);
        
        if (nameInput) {
            const displayName = nameInput.value;
            document.querySelectorAll('.user-display-name').forEach(el => {
                el.textContent = displayName;
            });
        }
        if (autoSpeakToggle) {
            autoSpeak = autoSpeakToggle.checked;
        }
    }

    async function saveAppSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = voiceSelect ? voiceSelect.value : '';
        const autoSpeakEnabled = autoSpeakToggle ? autoSpeakToggle.checked : false;

        // Save to localStorage
        localStorage.setItem('phantom-voice', voice);
        localStorage.setItem('phantom-autospeak', autoSpeakEnabled);
        
        // Update app state
        autoSpeak = autoSpeakEnabled;

        // Mock backend save
        console.log('Saving settings:', { theme, voice, autoSpeak });
        
        closeModal(settingsModal);
        // Simple feedback
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveSettingsBtn.textContent = originalText;
        }, 1500);
    }

    async function saveProfileSettings() {
        const displayName = nameInput ? nameInput.value : '';


        const result = await fetchApi('/api/update_profile', {
            method: 'PUT',
            body: { displayName }
        });

        if (result) {
            localStorage.setItem('phantom-display-name', displayName);
            applySettings();
            closeModal(editProfileModal);
            alert('Profile saved successfully!');
        } else {
            alert('Error saving profile.');
        }
    }

    function loadSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = localStorage.getItem('phantom-voice');
        const name = localStorage.getItem('phantom-display-name');
        const autoSpeakEnabled = localStorage.getItem('phantom-autospeak') === 'true';

        applyTheme(theme);
        if (name && nameInput) nameInput.value = name;
        if (autoSpeakToggle) {
            autoSpeakToggle.checked = autoSpeakEnabled;
            autoSpeak = autoSpeakEnabled;
        }
        
        const voiceInterval = setInterval(() => {
            if (availableVoices.length) {
                populateVoiceList(); // Ensure list is populated before setting value
                if (voice && voiceSelect) {
                    voiceSelect.value = voice;
                }
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
    
    // FIX: New function to handle both sending and saving edits
    function handlePrimaryAction() {
        if (!sendButton) return;

        const isSaveMode = sendButton.dataset.saveMode === 'true';
        const editingIndex = sendButton.dataset.editingIndex;

        if (isSaveMode && editingIndex !== undefined) {
            handleSaveEdit(parseInt(editingIndex, 10));
        } else {
            handleSendMessage();
        }
    }

    function handleSaveEdit(index) {
        const newText = chatInput.value.trim();
        if (newText && chatHistory[index] && chatHistory[index].role === 'user') {
            chatHistory[index].parts = [{ text: newText }];
            renderMessages(); // Re-render to show the change
            
            // Optionally, you could re-submit the entire conversation from this point
            // For now, we just update it visually on the client.
        }

        // Reset send button state
        delete sendButton.dataset.saveMode;
        delete sendButton.dataset.editingIndex;
        sendButton.title = 'Send message';
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    async function handleSendMessage(parts) {
        let messageParts = parts;
        if (!messageParts) {
            const messageText = chatInput.value.trim();
            if (messageText === '' && !attachedFile) return;
            messageParts = [];
            if (attachedFile) {
                const imageBase64 = await convertFileToBase64(attachedFile);
                messageParts.push({
                    inlineData: { mimeType: attachedFile.type, data: imageBase64.split(',')[1] }
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

        chatHistory.push({ role: "user", parts: messageParts, timestamp: new Date().toISOString() });
        renderMessages();
        
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }
        removeAttachedFile();
        selectTool(null);

        const payload = { contents: chatHistory, session_id: currentSessionId };
        if(loadingIndicator) loadingIndicator.style.display = 'block';
        const result = await api.sendMessage(payload);
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        
        let modelResponseText = "Sorry, something went wrong.";
        if (result && result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            modelResponseText = result.candidates[0].content.parts[0].text;
        } else if (result && result.error?.message) {
            modelResponseText = result.error.message;
        }
        
        chatHistory.push({ role: "model", parts: [{ text: modelResponseText }], timestamp: new Date().toISOString() });
        renderMessages();
        if (autoSpeak) speakText(modelResponseText);
        
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

    async function switchChatSession(sessionId) {
        if (!sessionId) {
            console.error("switchChatSession called with no sessionId");
            return;
        }
        console.log(`Switching to session: ${sessionId}`);
        currentSessionId = sessionId;
        chatHistory = []; // Clear old messages
        renderMessages(); // Clear the UI
        renderSuggestionPrompts(); // Show suggestions for the new chat
        if (chatTitle) chatTitle.textContent = "New Chat";
    
        // Visually update the history list
        const sessions = await api.getAllSessions();
        if (sessions) {
            renderChatHistory(sessions, currentSessionId);
            // Find the new session's title and update the header
            const newSessionDetails = sessions.sessions.find(s => s.session_id === sessionId);
            if (newSessionDetails && chatTitle) {
                chatTitle.textContent = newSessionDetails.title;
            }
        }
    
        // Now load the actual history for the session
        await loadChat(sessionId);
    }

    async function handleNewChat() {
        console.log('handleNewChat called');
        try {
            const response = await fetch('/api/new_chat_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            console.log('New chat session response:', response);
            if (response.ok) {
                const newSession = await response.json();
                console.log('New session created:', newSession);
                await loadChatHistory();
                await switchChatSession(newSession.session_id);
                // No need to manually add to chatHistory, loadChatHistory will get it
            } else {
                console.error('Failed to create new chat session, status:', response.status);
                const errorData = await response.text();
                console.error('Error data:', errorData);
                showToast('Error creating new chat. Please try again.');
            }
        } catch (error) {
            console.error('Error in handleNewChat:', error);
            showToast('An unexpected error occurred. Please check your connection and try again.');
        }
    };

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
                showToast('Failed to rename session.');
            }
        }
    }

    async function handleDeleteSession(sessionId) {
        showModal(getEl('modal'), {
            title: 'Delete Chat?',
            message: 'Are you sure you want to delete this chat? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                const result = await api.deleteSession(sessionId);
                if (result) {
                    if (sessionId === currentSessionId) {
                        // If we deleted the active chat, start a new one
                        await handleNewChat();
                    } else {
                        // Otherwise, just refresh the list
                        const sessions = await api.getAllSessions();
                        renderChatHistory(sessions, currentSessionId);
                    }
                    showToast('Chat deleted successfully.');
                } else {
                    showToast('Failed to delete session.');
                }
            }
        });
    }
    
    // =====================================================================
    // --- SPEECH & THEME ---
    // =====================================================================
    function populateVoiceList() {
        if (!voiceSelect || !synth) return;
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
    
    if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    // FIX: Consolidated to a single speakText function
    function speakText(text, force = false) {
        if (!text || !synth) return;
        if (!force && !autoSpeak) return;
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceSelect && voiceSelect.value) {
            const selectedVoice = availableVoices.find(voice => voice.name === voiceSelect.value);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        try {
            synth.cancel();
            synth.speak(utterance);
        } catch (err) { console.warn('speakText error', err); }
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && micButton) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        micButton.addEventListener('click', () => recognition.start());
        recognition.onresult = (event) => {
            if(chatInput) {
                chatInput.value = event.results[0][0].transcript;
                handlePrimaryAction(); // Use the new primary action handler
            }
        };
        recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    }

    // =====================================================================
    // --- SETTINGS & PROFILE FUNCTIONS ---
    // =====================================================================
    function applySettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        applyTheme(theme);
        
        if (nameInput) {
            const displayName = nameInput.value;
            document.querySelectorAll('.user-display-name').forEach(el => {
                el.textContent = displayName;
            });
        }
        if (autoSpeakToggle) {
            autoSpeak = autoSpeakToggle.checked;
        }
    }

    async function saveAppSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = voiceSelect ? voiceSelect.value : '';
        const autoSpeakEnabled = autoSpeakToggle ? autoSpeakToggle.checked : false;

        // Save to localStorage
        localStorage.setItem('phantom-voice', voice);
        localStorage.setItem('phantom-autospeak', autoSpeakEnabled);
        
        // Update app state
        autoSpeak = autoSpeakEnabled;

        // Mock backend save
        console.log('Saving settings:', { theme, voice, autoSpeak });
        
        closeModal(settingsModal);
        // Simple feedback
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveSettingsBtn.textContent = originalText;
        }, 1500);
    }

    async function saveProfileSettings() {
        const displayName = nameInput ? nameInput.value : '';


        const result = await fetchApi('/api/update_profile', {
            method: 'PUT',
            body: { displayName }
        });

        if (result) {
            localStorage.setItem('phantom-display-name', displayName);
            applySettings();
            closeModal(editProfileModal);
            alert('Profile saved successfully!');
        } else {
            alert('Error saving profile.');
        }
    }

    function loadSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = localStorage.getItem('phantom-voice');
        const name = localStorage.getItem('phantom-display-name');
        const autoSpeakEnabled = localStorage.getItem('phantom-autospeak') === 'true';

        applyTheme(theme);
        if (name && nameInput) nameInput.value = name;
        if (autoSpeakToggle) {
            autoSpeakToggle.checked = autoSpeakEnabled;
            autoSpeak = autoSpeakEnabled;
        }
        
        const voiceInterval = setInterval(() => {
            if (availableVoices.length) {
                populateVoiceList(); // Ensure list is populated before setting value
                if (voice && voiceSelect) {
                    voiceSelect.value = voice;
                }
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
    
    // FIX: New function to handle both sending and saving edits
    function handlePrimaryAction() {
        if (!sendButton) return;

        const isSaveMode = sendButton.dataset.saveMode === 'true';
        const editingIndex = sendButton.dataset.editingIndex;

        if (isSaveMode && editingIndex !== undefined) {
            handleSaveEdit(parseInt(editingIndex, 10));
        } else {
            handleSendMessage();
        }
    }

    function handleSaveEdit(index) {
        const newText = chatInput.value.trim();
        if (newText && chatHistory[index] && chatHistory[index].role === 'user') {
            chatHistory[index].parts = [{ text: newText }];
            renderMessages(); // Re-render to show the change
            
            // Optionally, you could re-submit the entire conversation from this point
            // For now, we just update it visually on the client.
        }

        // Reset send button state
        delete sendButton.dataset.saveMode;
        delete sendButton.dataset.editingIndex;
        sendButton.title = 'Send message';
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    async function handleSendMessage(parts) {
        let messageParts = parts;
        if (!messageParts) {
            const messageText = chatInput.value.trim();
            if (messageText === '' && !attachedFile) return;
            messageParts = [];
            if (attachedFile) {
                const imageBase64 = await convertFileToBase64(attachedFile);
                messageParts.push({
                    inlineData: { mimeType: attachedFile.type, data: imageBase64.split(',')[1] }
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

        chatHistory.push({ role: "user", parts: messageParts, timestamp: new Date().toISOString() });
        renderMessages();
        
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }
        removeAttachedFile();
        selectTool(null);

        const payload = { contents: chatHistory, session_id: currentSessionId };
        if(loadingIndicator) loadingIndicator.style.display = 'block';
        const result = await api.sendMessage(payload);
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        
        let modelResponseText = "Sorry, something went wrong.";
        if (result && result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            modelResponseText = result.candidates[0].content.parts[0].text;
        } else if (result && result.error?.message) {
            modelResponseText = result.error.message;
        }
        
        chatHistory.push({ role: "model", parts: [{ text: modelResponseText }], timestamp: new Date().toISOString() });
        renderMessages();
        if (autoSpeak) speakText(modelResponseText);
        
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

    async function switchChatSession(sessionId) {
        if (!sessionId) {
            console.error("switchChatSession called with no sessionId");
            return;
        }
        console.log(`Switching to session: ${sessionId}`);
        currentSessionId = sessionId;
        chatHistory = []; // Clear old messages
        renderMessages(); // Clear the UI
        renderSuggestionPrompts(); // Show suggestions for the new chat
        if (chatTitle) chatTitle.textContent = "New Chat";
    
        // Visually update the history list
        const sessions = await api.getAllSessions();
        if (sessions) {
            renderChatHistory(sessions, currentSessionId);
            // Find the new session's title and update the header
            const newSessionDetails = sessions.sessions.find(s => s.session_id === sessionId);
            if (newSessionDetails && chatTitle) {
                chatTitle.textContent = newSessionDetails.title;
            }
        }
    
        // Now load the actual history for the session
        await loadChat(sessionId);
    }

    async function handleNewChat() {
        console.log('handleNewChat called');
        try {
            const response = await fetch('/api/new_chat_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            console.log('New chat session response:', response);
            if (response.ok) {
                const newSession = await response.json();
                console.log('New session created:', newSession);
                await loadChatHistory();
                await switchChatSession(newSession.session_id);
                // No need to manually add to chatHistory, loadChatHistory will get it
            } else {
                console.error('Failed to create new chat session, status:', response.status);
                const errorData = await response.text();
                console.error('Error data:', errorData);
                showToast('Error creating new chat. Please try again.');
            }
        } catch (error) {
            console.error('Error in handleNewChat:', error);
            showToast('An unexpected error occurred. Please check your connection and try again.');
        }
    };

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
                showToast('Failed to rename session.');
            }
        }
    }

    async function handleDeleteSession(sessionId) {
        showModal(getEl('modal'), {
            title: 'Delete Chat?',
            message: 'Are you sure you want to delete this chat? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                const result = await api.deleteSession(sessionId);
                if (result) {
                    if (sessionId === currentSessionId) {
                        // If we deleted the active chat, start a new one
                        await handleNewChat();
                    } else {
                        // Otherwise, just refresh the list
                        const sessions = await api.getAllSessions();
                        renderChatHistory(sessions, currentSessionId);
                    }
                    showToast('Chat deleted successfully.');
                } else {
                    showToast('Failed to delete session.');
                }
            }
        });
    }
    
    // =====================================================================
    // --- SPEECH & THEME ---
    // =====================================================================
    function populateVoiceList() {
        if (!voiceSelect || !synth) return;
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
    
    if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    // FIX: Consolidated to a single speakText function
    function speakText(text, force = false) {
        if (!text || !synth) return;
        if (!force && !autoSpeak) return;
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceSelect && voiceSelect.value) {
            const selectedVoice = availableVoices.find(voice => voice.name === voiceSelect.value);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        try {
            synth.cancel();
            synth.speak(utterance);
        } catch (err) { console.warn('speakText error', err); }
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && micButton) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        micButton.addEventListener('click', () => recognition.start());
        recognition.onresult = (event) => {
            if(chatInput) {
                chatInput.value = event.results[0][0].transcript;
                handlePrimaryAction(); // Use the new primary action handler
            }
        };
        recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    }

    // =====================================================================
    // --- SETTINGS & PROFILE FUNCTIONS ---
    // =====================================================================
    function applySettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        applyTheme(theme);
        
        if (nameInput) {
            const displayName = nameInput.value;
            document.querySelectorAll('.user-display-name').forEach(el => {
                el.textContent = displayName;
            });
        }
        if (autoSpeakToggle) {
            autoSpeak = autoSpeakToggle.checked;
        }
    }

    async function saveAppSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = voiceSelect ? voiceSelect.value : '';
        const autoSpeakEnabled = autoSpeakToggle ? autoSpeakToggle.checked : false;

        // Save to localStorage
        localStorage.setItem('phantom-voice', voice);
        localStorage.setItem('phantom-autospeak', autoSpeakEnabled);
        
        // Update app state
        autoSpeak = autoSpeakEnabled;

        // Mock backend save
        console.log('Saving settings:', { theme, voice, autoSpeak });
        
        closeModal(settingsModal);
        // Simple feedback
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveSettingsBtn.textContent = originalText;
        }, 1500);
    }

    async function saveProfileSettings() {
        const displayName = nameInput ? nameInput.value : '';


        const result = await fetchApi('/api/update_profile', {
            method: 'PUT',
            body: { displayName }
        });

        if (result) {
            localStorage.setItem('phantom-display-name', displayName);
            applySettings();
            closeModal(editProfileModal);
            alert('Profile saved successfully!');
        } else {
            alert('Error saving profile.');
        }
    }

    function loadSettings() {
        const theme = localStorage.getItem('phantom-theme') || 'theme-default';
        const voice = localStorage.getItem('phantom-voice');
        const name = localStorage.getItem('phantom-display-name');
        const autoSpeakEnabled = localStorage.getItem('phantom-autospeak') === 'true';

        applyTheme(theme);
        if (name && nameInput) nameInput.value = name;
        if (autoSpeakToggle) {
            autoSpeakToggle.checked = autoSpeakEnabled;
            autoSpeak = autoSpeakEnabled;
        }
        
        const voiceInterval = setInterval(() => {
            if (availableVoices.length) {
                populateVoiceList(); // Ensure list is populated before setting value
                if (voice && voiceSelect) {
                    voiceSelect.value = voice;
                }
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
           