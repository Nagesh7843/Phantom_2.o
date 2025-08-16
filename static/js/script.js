// --- IMPORTANT: CONFIGURE YOUR BACKEND URL ---
const BACKEND_API_BASE_URL = "http://127.0.0.1:5000";

// --- DOM Element References ---
const appContainer = document.getElementById('app-container');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');

// Sidebar elements
const userSidebarAvatar = document.getElementById('user-sidebar-avatar');
const userSidebarName = document.getElementById('user-sidebar-name');
const userSidebarEmail = document.getElementById('user-sidebar-email');
const sidebarUserProfileSection = document.getElementById('user-profile-click-area');

const newChatButtonSidebar = document.getElementById('new-chat-button-sidebar');
const chatHistorySidebar = document.querySelector('#actual-chat-history-list');
const logoutButton = document.getElementById('logout-button');

// Main content elements
const chatHeader = document.querySelector('#main-content .chat-header');
const settingsButtonMain = document.getElementById('settings-button-main');
const settingsButtonSidebar = document.getElementById('settings-button-sidebar');

const sidebarToggleButton = document.getElementById('sidebar-toggle-button');

const chatMessages = document.getElementById('chat-messages');
const initialPrompt = document.getElementById('initial-prompt');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const imageUploadButton = document.getElementById('image-upload-button');
const imageUploadInput = document.getElementById('image-upload-input');
const cameraCaptureButton = document.getElementById('camera-capture-button');
const loadingIndicator = document.getElementById('loading-indicator');

// Settings popover elements
const floatingTools = document.getElementById('floating-tools');
const closeToolsBtn = document.getElementById('close-tools-btn');
const clearChatSettingsButton = document.getElementById('clear-chat-button-settings');
const themeSelect = document.getElementById('theme-select');
const voiceSelect = document.getElementById('voice-select');
const languageSelect = document.getElementById('language-select');
const speechToggle = document.getElementById('speech-toggle');

// History list container
const actualChatHistoryList = document.getElementById('actual-chat-history-list');
const navItemHistoryToggle = document.getElementById('nav-item-history-toggle');

// NEW: Profile Modal elements
const profileModal = document.getElementById('profile-modal');
const closeProfileBtn = document.getElementById('close-profile-btn');
const profileModalAvatar = document.getElementById('profile-modal-avatar');
const profileModalName = document.getElementById('profile-modal-name');
const profileModalEmail = document.getElementById('profile-modal-email');

// --- Global State Variables ---
let currentSessionId = null;
let chatHistory = [];
let selectedVoice = null;
let selectedLanguage = 'en-US';
let selectedTheme = 'theme-dark';
let allConversations = JSON.parse(localStorage.getItem('chatConversations')) || [];

// --- User Profile Management (Loaded from Jinja2 context and localStorage) ---
const USER_DISPLAY_NAME_KEY = "phantom_2_o_user_name";
const USER_LANGUAGE_KEY = "phantom_2_o_user_language";
const USER_THEME_KEY = "phantom_2_o_user_theme";
let currentUserName = "User";
let currentUserEmail = "";
let currentUserPictureUrl = null;
let currentUserInitials = "U";

function updateUserProfileUI() {
    currentUserName = FLASK_USER_DATA.displayName || localStorage.getItem(USER_DISPLAY_NAME_KEY) || "User";
    currentUserEmail = FLASK_USER_DATA.email || '';
    currentUserPictureUrl = FLASK_USER_DATA.pictureUrl && FLASK_USER_DATA.pictureUrl !== 'None' ? FLASK_USER_DATA.pictureUrl : null;
    currentUserInitials = getInitials(currentUserName);

    if (userSidebarName) userSidebarName.textContent = currentUserName;
    if (userSidebarEmail) userSidebarEmail.textContent = currentUserEmail;

    if (userSidebarAvatar) {
        if (currentUserPictureUrl) {
            userSidebarAvatar.innerHTML = `<img src="${currentUserPictureUrl}" alt="Profile Picture" class="w-full h-full rounded-full object-cover">`;
        } else {
            userSidebarAvatar.textContent = currentUserInitials;
        }
    }

    if (profileModalName) profileModalName.textContent = currentUserName;
    if (profileModalEmail) profileModalEmail.textContent = currentUserEmail;
    if (profileModalAvatar) {
        if (currentUserPictureUrl) {
            profileModalAvatar.innerHTML = `<img src="${currentUserPictureUrl}" alt="Profile Picture" class="w-full h-full rounded-full object-cover">`;
        } else {
            profileModalAvatar.innerHTML = currentUserInitials;
        }
    }
}

function getInitials(name) {
    if (!name) return "U";
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    } else if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return "U";
}

// --- General Modal/Popover Control Functions ---
function toggleModal(modalElement) {
    const isModalOpen = modalElement.classList.contains('open');
    const overlay = document.getElementById('modal-overlay');

    if (isModalOpen) {
        modalElement.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    } else {
        // Close any other open modals first
        if (floatingTools && floatingTools.classList.contains('open')) {
            floatingTools.classList.remove('open');
        }
        if (profileModal && profileModal.classList.contains('open') && modalElement !== profileModal) {
            profileModal.classList.remove('open');
        }

        modalElement.classList.add('open');
        if (!overlay) {
            const newOverlay = document.createElement('div');
            newOverlay.id = 'modal-overlay';
            document.body.appendChild(newOverlay);
            newOverlay.addEventListener('click', () => {
                toggleModal(modalElement);
            }, {once: true});
            requestAnimationFrame(() => newOverlay.classList.add('open'));
        } else {
            overlay.classList.add('open');
            overlay.addEventListener('click', () => { toggleModal(modalElement); }, {once: true}); 
        }
    }
}

// --- Event Listeners for UI Interactions ---

// Settings Popover Logic
if (settingsButtonSidebar) {
    settingsButtonSidebar.addEventListener('click', () => { toggleModal(floatingTools); });
}
if (settingsButtonMain) {
    settingsButtonMain.addEventListener('click', () => { toggleModal(floatingTools); });
}
if (closeToolsBtn) {
    closeToolsBtn.addEventListener('click', () => { toggleModal(floatingTools); });
}

// Clicking user profile area in sidebar opens profile modal
if (sidebarUserProfileSection) {
    sidebarUserProfileSection.addEventListener('click', () => {
        updateUserProfileUI();
        toggleModal(profileModal);
    });
}
if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', () => { toggleModal(profileModal); });
}


// Sidebar Toggle Button (Hamburger Menu)
if (sidebarToggleButton) {
    sidebarToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-closed');
        const overlay = document.getElementById('sidebar-overlay');

        if (document.body.classList.contains('sidebar-closed')) {
            if (overlay) overlay.remove();
        } else {
            if (!overlay) {
                const newOverlay = document.createElement('div');
                newOverlay.id = 'sidebar-overlay';
                document.body.appendChild(newOverlay);
                newOverlay.addEventListener('click', () => {
                    document.body.classList.add('sidebar-closed');
                    newOverlay.remove();
                }, {once: true});
            }
        }
    });
}

function setInitialSidebarState() {
    if (window.innerWidth <= 768) {
        document.body.classList.add('sidebar-closed');
        const existingOverlay = document.getElementById('sidebar-overlay');
        if (existingOverlay) existingOverlay.remove();
    } else {
        document.body.classList.remove('sidebar-closed');
        const existingOverlay = document.getElementById('sidebar-overlay');
        if (existingOverlay) existingOverlay.remove();
    }
}
window.addEventListener('resize', setInitialSidebarState);


// History Toggle
if (navItemHistoryToggle && actualChatHistoryList) {
    console.log("History toggle elements found. Attaching listener."); // DEBUG
    navItemHistoryToggle.addEventListener('click', () => {
        console.log("History nav item clicked."); // DEBUG
        actualChatHistoryList.classList.toggle('hidden');
        console.log("History list is now hidden:", actualChatHistoryList.classList.contains('hidden')); // DEBUG
        // Re-render history sidebar content to ensure it's up-to-date when toggled
        renderHistorySidebar(); 
    });
} else {
    console.warn("History toggle elements (navItemHistoryToggle or actualChatHistoryList) not found on DOM."); // DEBUG
}


// --- Chat History Management ---
function saveCurrentConversation() {
    const hasAnyActualMessage = chatHistory.some(msg => msg.role === 'user' && msg.parts && msg.parts.length > 0 && msg.parts.some(p => p.text && p.text.trim() !== ''));

    if (hasAnyActualMessage) {
        const firstUserMessage = chatHistory.find(msg => msg.role === 'user')?.parts.find(p => p.text)?.text;
        const title = firstUserMessage ? firstUserMessage.substring(0, 40) + (firstUserMessage.length > 40 ? '...' : '') : "New Chat";
        const timestamp = new Date().toLocaleString('en-IN', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        if (!chatHistory[0].sessionId) {
            chatHistory.unshift({ sessionId: Date.now(), parts: [] });
        }

        const existingIndex = allConversations.findIndex(c => c.id === chatHistory[0].sessionId);
        const conversationData = {
            id: chatHistory[0].sessionId,
            title: title,
            timestamp: timestamp,
            messages: JSON.parse(JSON.stringify(chatHistory))
        };

        if (existingIndex !== -1) {
            allConversations[existingIndex] = conversationData;
        } else {
            allConversations.unshift(conversationData);
        }

        allConversations = allConversations.slice(0, 10);
        localStorage.setItem('chatConversations', JSON.stringify(allConversations));
    }
}

function loadConversation(convoId) {
    saveCurrentConversation();

    const convo = allConversations.find(c => c.id === convoId);
    if (convo) {
        chatHistory = JSON.parse(JSON.stringify(convo.messages));
        if (!chatHistory[0].sessionId) {
            chatHistory.unshift({ sessionId: convoId, parts: [] });
        }
        initialPrompt.classList.add('hidden');
        renderChatMessages();
        setActiveChat(convoId);
        if (actualChatHistoryList) actualChatHistoryList.classList.remove('hidden');
    }
    userInput.focus();
}

function renderChatMessages() {
    chatMessages.innerHTML = '';
    const hasActualMessages = chatHistory.some(msg => msg.parts && msg.parts.length > 0 && !msg.sessionId);

    if (!hasActualMessages) {
        initialPrompt.classList.remove('hidden');
        return;
    } else {
        initialPrompt.classList.add('hidden');
    }

    chatHistory.forEach(msg => {
        if (!msg.parts || msg.parts.length === 0 || msg.sessionId) {
            return;
        }
        
        const role = msg.role === 'user' ? 'user' : 'bot';

        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper', role);

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role);

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('message-avatar');
        if (role === 'user') {
            if (FLASK_USER_DATA.pictureUrl && FLASK_USER_DATA.pictureUrl !== 'None') {
                avatarDiv.innerHTML = `<img src="${FLASK_USER_DATA.pictureUrl}" alt="User Picture" class="w-full h-full rounded-full object-cover">`;
            } else {
                avatarDiv.textContent = currentUserInitials;
            }
        } else {
            avatarDiv.textContent = 'AI';
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        
        let combinedTextContent = '';

        msg.parts.forEach(part => {
            if (typeof part.text === 'string') {
                const tempDiv = document.createElement('div');
                let formattedText = part.text;
                formattedText = formattedText.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
                    return `<pre>${codeContent.trim()}</pre>`;
                });
                
                formattedText = formattedText.replace(/^### (.*$)/gim, '<h3>$1</h3>');
                formattedText = formattedText.replace(/^## (.*$)/gim, '<h2>$1</h2>');
                formattedText = formattedText.replace(/^# (.*$)/gim, '<h1>$1</h1>');
                formattedText = formattedText.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
                formattedText = formattedText.replace(/\*(.*?)\*/gim, '<em>$1</em>');
                formattedText = formattedText.replace(/`(.*?)`/gim, '<code>$1</code>');

                let lines = formattedText.split('\n');
                let inUnorderedList = false;
                let inOrderedList = false;
                let processedLines = [];

                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    if (line.match(/^\s*[-*+]\s/)) {
                        if (inOrderedList) { processedLines.push('</ol>'); inOrderedList = false; }
                        if (!inUnorderedList) { processedLines.push('<ul>'); inUnorderedList = true; }
                        processedLines.push(`<li>${line.replace(/^\s*[-*+]\s/, '').trim()}</li>`);
                    } else if (line.match(/^\s*\d+\.\s/)) {
                        if (inUnorderedList) { processedLines.push('</ul>'); inUnorderedList = false; }
                        if (!inOrderedList) { processedLines.push('<ol>'); inOrderedList = true; }
                        processedLines.push(`<li>${line.replace(/^\s*\d+\.\s/, '').trim()}</li>`);
                    } else {
                        if (inUnorderedList) { processedLines.push('</ul>'); inUnorderedList = false; }
                        if (inOrderedList) { processedLines.push('</ol>'); inOrderedList = false; }
                        processedLines.push(line);
                    }
                }
                if (inUnorderedList) processedLines.push('</ul>');
                if (inOrderedList) processedLines.push('</ol>');

                formattedText = processedLines.join('\n');
                tempDiv.innerHTML = formattedText;
                while(tempDiv.firstChild) { contentDiv.appendChild(tempDiv.firstChild); }
                combinedTextContent += part.text + ' ';
            } else if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                const imgElement = document.createElement('img');
                imgElement.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                imgElement.classList.add('max-w-full', 'h-auto', 'rounded-lg', 'mt-2', 'shadow-md');
                contentDiv.appendChild(imgElement);
            }
        });

        messageDiv.appendChild(avatarDiv);
        contentDiv.style.userSelect = 'text';
        messageDiv.appendChild(contentDiv);

        if (role === 'bot') {
            const speakerIcon = document.createElement('span');
            speakerIcon.classList.add('speaker-icon');
            speakerIcon.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
            speakerIcon.title = "Listen to message";
            speakerIcon.onclick = () => {
                if (synth.speaking) synth.cancel();
                const tempUtterance = new SpeechSynthesisUtterance(combinedTextContent.trim());
                if (selectedVoice) {
                    tempUtterance.voice = selectedVoice;
                } else {
                    const langVoice = availableVoices.find(voice => voice.lang.startsWith(selectedLanguage.substring(0,2)));
                    if (langVoice) tempUtterance.voice = langVoice;
                }
                synth.speak(tempUtterance);
            };
            messageDiv.appendChild(speakerIcon);

            const messageActionsDiv = document.createElement('div');
            messageActionsDiv.classList.add('message-actions');

            const likeBtn = document.createElement('button');
            likeBtn.title = "Like this response";
            likeBtn.innerHTML = `<i class="fa-solid fa-thumbs-up"></i>`;
            likeBtn.addEventListener('click', () => alert('Feedback: Liked!'));

            const dislikeBtn = document.createElement('button');
            dislikeBtn.title = "Dislike this response";
            dislikeBtn.innerHTML = `<i class="fa-solid fa-thumbs-down"></i>`;
            dislikeBtn.addEventListener('click', () => alert('Feedback: Disliked!'));

            const shareBtn = document.createElement('button');
            shareBtn.title = "Share this response";
            shareBtn.innerHTML = `<i class="fa-solid fa-share-nodes"></i>`;
            shareBtn.addEventListener('click', () => {
                if (navigator.share) {
                    navigator.share({
                        title: 'Chatbot Response',
                        text: combinedTextContent.trim(),
                        url: window.location.href,
                    }).then(() => {
                        console.log('Shared successfully!');
                    }).catch((error) => {
                        console.error('Error sharing:', error);
                        alert('Could not share. Please copy the text manually.');
                    });
                } else {
                    navigator.clipboard.writeText(combinedTextContent.trim()).then(() => {
                        alert('Response copied to clipboard!');
                    });
                }
            });

            messageActionsDiv.appendChild(likeBtn);
            messageActionsDiv.appendChild(dislikeBtn);
            messageActionsDiv.appendChild(shareBtn);
            messageDiv.appendChild(messageActionsDiv);
        }
        messageWrapper.appendChild(messageDiv);
        chatMessages.appendChild(messageWrapper);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderHistorySidebar() {
    if (actualChatHistoryList) {
        actualChatHistoryList.innerHTML = '';
    } else {
        console.error("actualChatHistoryList element not found!");
        return;
    }

    if (!document.getElementById('current-chat-sidebar-item')) {
        const currentChatStatic = document.createElement('div');
        currentChatStatic.classList.add('nav-item');
        currentChatStatic.id = 'current-chat-sidebar-item';
        currentChatStatic.innerHTML = `<i class="fa-solid fa-message"></i><span>Current Chat</span>`;
        currentChatStatic.addEventListener('click', () => {
            initialPrompt.classList.add('hidden');
            renderChatMessages();
            setActiveChat(chatHistory[0]?.sessionId || null);
            if (actualChatHistoryList) actualChatHistoryList.classList.remove('hidden');
        });
        
     if (chatHistorySidebar) {
        chatHistorySidebar.prepend(currentChatStatic);
    } else {  
    console.error("chatHistorySidebar element not found, cannot prepend.");
    }
    }


    if (allConversations.length === 0) {
        const noHistoryItem = document.createElement('div');
        noHistoryItem.classList.add('nav-item', 'no-hover-effect');
        noHistoryItem.textContent = 'No past chats';
        actualChatHistoryList.appendChild(noHistoryItem);
    } else {
        allConversations.forEach(convo => {
            if (convo.id === chatHistory[0]?.sessionId || (convo.messages.length === 1 && convo.messages[0].sessionId && (!convo.messages[0].parts || convo.messages[0].parts.length === 0))) {
                return;
            }
            const navItemDiv = document.createElement('div');
            navItemDiv.classList.add('nav-item');
            navItemDiv.dataset.id = convo.id;
            navItemDiv.innerHTML = `<i class="fa-solid fa-history"></i><span>${convo.title}</span>`;
            navItemDiv.addEventListener('click', () => loadConversation(convo.id));
            actualChatHistoryList.appendChild(navItemDiv);
        });
    }
    setActiveChat(chatHistory[0]?.sessionId || null);
}

function setActiveChat(id) {
    document.querySelectorAll('.nav-list .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const currentChatElement = document.getElementById('current-chat-sidebar-item');
    if (currentChatElement) {
        const hasActualMessages = chatHistory.some(msg => msg.parts && msg.parts.length > 0 && !msg.sessionId);
        if (hasActualMessages && (chatHistory[0]?.sessionId === id || id === null)) {
            currentChatElement.classList.add('active');
        } else if (!hasActualMessages && id === null) {
            currentChatElement.classList.add('active');
        }
    }
    
    if (id) {
        const activeElement = document.querySelector(`.nav-item[data-id="${id}"]`);
        if (activeElement) {
            activeElement.classList.add('active');
        }
    }
}

// --- Web Speech API - Speech Synthesis (Text-to-Speech) ---
const synth = window.speechSynthesis;
let availableVoices = [];

function populateVoiceList() {
    availableVoices = synth.getVoices();
    voiceSelect.innerHTML = '';

    const autoOption = document.createElement('option');
    autoOption.textContent = 'Auto (Browser Default)';
    autoOption.value = '';
    voiceSelect.appendChild(autoOption);

    availableVoices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        if (voice.lang === selectedLanguage || (voice.default && voice.lang.startsWith('en-'))) {
            option.selected = true;
            selectedVoice = voice;
        }
        voiceSelect.appendChild(option);
    });

    if (!selectedVoice && availableVoices.length > 0) {
        const defaultVoice = availableVoices.find(voice => voice.lang.startsWith(selectedLanguage.substring(0,2))) || availableVoices.find(voice => voice.default);
        if (defaultVoice) {
            voiceSelect.value = defaultVoice.name;
            selectedVoice = defaultVoice;
        } else {
            voiceSelect.value = availableVoices[0].name;
            selectedVoice = availableVoices[0];
        }
    }
}

function populateLanguageList() {
    const languages = [
        { name: "English (US)", code: "en-US" },
        { name: "Hindi (India)", code: "hi-IN" },
        { name: "Marathi (India)", code: "mr-IN" },
        { name: "Spanish (Spain)", code: "es-ES" },
        { name: "French (France)", code: "fr-FR" },
        { name: "German (Germany)", code: "de-DE" },
        { name: "Japanese (Japan)", code: "ja-JP" },
        { name: "Chinese (Mandarin)", code: "zh-CN" },
    ];

    languageSelect.innerHTML = '';
    languages.forEach(lang => {
        const option = document.createElement('option');
        option.textContent = lang.name;
        option.value = lang.code;
        if (lang.code === selectedLanguage) {
            option.selected = true;
        }
        languageSelect.appendChild(option);
    });
}

function populateThemeList() {
    const themes = [
        { name: "Dark (Default)", code: "theme-dark" },
        { name: "Light", code: "theme-light" },
        { name: "Blue Accent", code: "theme-blue-accent" },
        { name: "Green Accent", code: "theme-green-accent" },
        { name: "Warm Grey", code: "theme-warm-grey" },
        { name: "High Contrast", code: "theme-high-contrast" },
    ];

    themeSelect.innerHTML = '';
    themes.forEach(theme => {
        const option = document.createElement('option');
        option.textContent = theme.name;
        option.value = theme.code;
        if (theme.code === selectedTheme) { // Corrected: theme.code === selectedTheme
            option.selected = true;
        }
        themeSelect.appendChild(option);
    });
}

function applyTheme(themeName) {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-blue-accent', 'theme-green-accent', 'theme-warm-grey', 'theme-high-contrast');
    document.body.classList.add(themeName);
    localStorage.setItem(USER_THEME_KEY, themeName);
}


synth.onvoiceschanged = () => {
    populateVoiceList();
    populateLanguageList();
    populateThemeList();
};

if (synth.getVoices().length > 0) {
    populateVoiceList();
    populateLanguageList();
    populateThemeList();
}

voiceSelect.addEventListener('change', () => {
    const selectedVoiceName = voiceSelect.value;
    selectedVoice = availableVoices.find(voice => voice.name === selectedVoiceName) || null;
    if (selectedVoice) {
        console.log('Selected voice:', selectedVoice.name);
    } else {
        console.log('Using browser default voice.');
    }
});

languageSelect.addEventListener('change', () => {
    selectedLanguage = languageSelect.value;
    localStorage.setItem(USER_LANGUAGE_KEY, selectedLanguage);
    populateVoiceList();
    console.log('Selected language:', selectedLanguage);
});

themeSelect.addEventListener('change', () => {
    selectedTheme = themeSelect.value;
    applyTheme(selectedTheme);
    console.log('Selected theme:', selectedTheme);
});


function speakText(text) {
    if (!speechToggle.checked) {
        return;
    }
    if (synth.speaking) {
        synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    
    let voiceToUse = null;
    if (selectedVoice && selectedVoice.lang.startsWith(selectedLanguage.substring(0,2))) {
        voiceToUse = selectedVoice;
    } else {
        voiceToUse = availableVoices.find(voice => voice.lang.startsWith(selectedLanguage.substring(0,2)));
    }

    if (voiceToUse) {
        utterance.voice = voiceToUse;
    } else {
        console.warn(`No specific voice found for language ${selectedLanguage}. Browser will use default.`);
    }
    
    utterance.lang = selectedLanguage;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    synth.speak(utterance);
}

// --- Web Speech API - Speech Recognition ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        micButton.classList.add('recording');
        userInput.placeholder = "Listening...";
        userInput.disabled = true;
        sendButton.disabled = true;
        imageUploadButton.disabled = true;
        cameraCaptureButton.disabled = true;
        speechToggle.disabled = true;
        voiceSelect.disabled = true;
        languageSelect.disabled = true;
        themeSelect.disabled = true;
        floatingTools.style.pointerEvents = 'none';
        newChatButtonSidebar.disabled = true;
        clearChatSettingsButton.disabled = true;
        logoutButton.disabled = true;
        if (sidebarToggleButton) sidebarToggleButton.disabled = true;
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        micButton.classList.remove('recording');
        userInput.placeholder = "Type your message...";
        userInput.disabled = false;
        sendButton.disabled = false;
        imageUploadButton.disabled = false;
        cameraCaptureButton.disabled = false;
        speechToggle.disabled = false;
        voiceSelect.disabled = false;
        languageSelect.disabled = false;
        themeSelect.disabled = false;
        floatingTools.style.pointerEvents = 'auto';
        newChatButtonSidebar.disabled = false;
        clearChatSettingsButton.disabled = false;
        logoutButton.disabled = false;
        if (sidebarToggleButton) sidebarToggleButton.disabled = false;
        sendButton.click();
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        micButton.classList.remove('recording');
        userInput.placeholder = "Type your message...";
        userInput.disabled = false;
        sendButton.disabled = false;
        imageUploadButton.disabled = false;
        cameraCaptureButton.disabled = false;
        speechToggle.disabled = false;
        voiceSelect.disabled = false;
        languageSelect.disabled = false;
        themeSelect.disabled = false;
        floatingTools.style.pointerEvents = 'auto';
        newChatButtonSidebar.disabled = false;
        clearChatSettingsButton.disabled = false;
        logoutButton.disabled = false;
        if (sidebarToggleButton) sidebarToggleButton.disabled = false;
        alert("Speech recognition error: " + event.error + "\nMake sure your microphone is connected and allowed.");
    };

    recognition.onend = () => {
        micButton.classList.remove('recording');
        userInput.placeholder = "Type your message...";
        userInput.disabled = false;
        sendButton.disabled = false;
        imageUploadButton.disabled = false;
        cameraCaptureButton.disabled = false;
        speechToggle.disabled = false;
        voiceSelect.disabled = false;
        languageSelect.disabled = false;
        themeSelect.disabled = false;
        floatingTools.style.pointerEvents = 'auto';
        newChatButtonSidebar.disabled = false;
        clearChatSettingsButton.disabled = false;
        logoutButton.disabled = false;
        if (sidebarToggleButton) sidebarToggleButton.disabled = false;
    };
} else {
    micButton.style.display = 'none';
    console.warn("Speech Recognition API not supported in this browser.");
}

// Add this entire new function to your script.js file
async function startNewChat() {
    console.log("Starting a new chat session via backend...");
    try {
        const response = await fetch(`${BACKEND_API_BASE_URL}/api/new_chat_session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Your backend automatically uses the Flask session cookie for authentication
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create a new chat session on the server.');
        }

        const data = await response.json();
        const newSessionId = data.session_id; // <-- This is the VALID ID from the backend

        // Now use this valid ID to reset the chat state
        chatMessages.innerHTML = '';
        initialPrompt.classList.remove('hidden');
        // IMPORTANT: The first item in chatHistory should just hold the ID
        chatHistory = [{ sessionId: newSessionId, parts: [] }];

        if (synth.speaking) {
            synth.cancel();
        }
        userInput.focus();
        // You might want to refresh the history from the server here too
        renderHistorySidebar(); 
        setActiveChat(newSessionId);

    } catch (error) {
        console.error("Error starting new chat:", error);
        alert("Could not start a new chat. Please check your connection and try again.");
    }
}
// Function to send message to Gemini API (through backend proxy)
async function getGeminiResponse() {
    loadingIndicator.classList.remove('hidden');
    sendButton.disabled = true;
    micButton.disabled = true;
    imageUploadButton.disabled = true;
    cameraCaptureButton.disabled = true;
    userInput.disabled = true;
    speechToggle.disabled = true;
    voiceSelect.disabled = true;    
    languageSelect.disabled = true;
    themeSelect.disabled = true;
    floatingTools.style.pointerEvents = 'none';
    newChatButtonSidebar.disabled = true;
    clearChatSettingsButton.disabled = true;
    logoutButton.disabled = true;
    if (sidebarToggleButton) sidebarToggleButton.disabled = true;

    const messagesForBackend = chatHistory
        .filter(msg => msg.parts && msg.parts.length > 0)
        .map(msg => {
            const { sessionId, ...rest } = msg;
            return rest;
        });

    const languageName = languageSelect.options[languageSelect.selectedIndex].textContent.split('(')[0].trim();

    // --- START OF THE FIX ---
  
    // 1. Get the current session ID from the chatHistory array.
    const currentSessionId = chatHistory[0]?.sessionId;

    const payload = {
        contents: messagesForBackend,
        language_name: languageName,
        session_id: String(currentSessionId) // 2. Add the session_id to the payload.
    };

    // --- END OF THE FIX ---

    const apiUrl = `${BACKEND_API_BASE_URL}/api/chat`;
    const headers = { 'Content-Type': 'application/json' };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();

        let modelResponseText = "Error: Could not get a response.";
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            modelResponseText = result.candidates[0].content.parts[0].text;
        } else if (result.error && result.error.message) {
            modelResponseText = `Backend Error: ${result.error.message}`;
        } else if (result.promptFeedback && result.promptFeedback.blockReason) {
            modelResponseText = `Sorry, your request was blocked due to: ${result.promptFeedback.blockReason}.`;
        }
        
        chatHistory.push({ role: "model", parts: [{ text: modelResponseText }] });
        return modelResponseText;

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error fetching from backend API:", error);
        let errorMessage;
        if (error.name === 'AbortError') {
            errorMessage = `Sorry, the request to the backend timed out. Please try again.`;
        } else if (error.message.includes("HTTP error!")) {
             errorMessage = `Backend/Server Error: ${error.message}. Please check your backend server and network.`;
        } else {
            errorMessage = `Sorry, I'm having trouble connecting right now. (${error.message})`;
        }
        chatHistory.push({ role: "model", parts: [{ text: errorMessage }] });
        return errorMessage;
    } finally {
        loadingIndicator.classList.add('hidden');
        sendButton.disabled = false;
        micButton.disabled = false;
        imageUploadButton.disabled = false;
        cameraCaptureButton.disabled = false;
        userInput.disabled = false;
        speechToggle.disabled = false;
        voiceSelect.disabled = false;
        languageSelect.disabled = false;
        themeSelect.disabled = false;
        floatingTools.style.pointerEvents = 'auto';
        newChatButtonSidebar.disabled = false;
        clearChatSettingsButton.disabled = false;
        logoutButton.disabled = false;
        if (sidebarToggleButton) sidebarToggleButton.disabled = false;
        userInput.focus();
        
        renderChatMessages();
        saveCurrentConversation();
        renderHistorySidebar();
    }
}

sendButton.addEventListener('click', async () => {
    const messageText = userInput.value.trim();
    let userMessageParts = [];

    if (messageText) {
        userMessageParts.push({ text: messageText });
    }

    if (imageUploadInput.files.length > 0) {
        const file = imageUploadInput.files[0];
        if (file) {
            const imageBase64 = await convertFileToBase64(file);
            userMessageParts.push({
                inlineData: {
                    mimeType: file.type,
                    data: imageBase64.split(',')[1]
                }
            });
        }
    }

    if (userMessageParts.length > 0) {
        chatHistory.push({ role: "user", parts: userMessageParts });
        userInput.value = '';
        imageUploadInput.value = '';
        renderChatMessages();

        const botResponseText = await getGeminiResponse();
        if (speechToggle.checked) {
            speakText(botResponseText);
        }
    }
});

imageUploadButton.addEventListener('click', () => {
    imageUploadInput.click();
});

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

cameraCaptureButton.addEventListener('click', async () => {
    alert("Camera access functionality is a placeholder. In a real app, this would open your camera.");
});

if (micButton) {
    micButton.addEventListener('click', () => {
        if (recognition) {
            try {
                recognition.start();
            }
            catch (e) {
                console.error("Speech recognition already started or other error:", e);
                alert("Speech recognition is already active or an error occurred. Please try again.");
            }
        }
    });
}

userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});

clearChatSettingsButton.addEventListener('click', startNewChat);

newChatButtonSidebar.addEventListener('click', startNewChat);

function initializeChat() {
    updateUserProfileUI();
    // loadUserProfile();     // This function seems missing from your provided code, you may need to check it
    setInitialSidebarState(); 

    // This part is now simplified
    if (allConversations.length > 0) {
        loadConversation(allConversations[0].id);
    } else {
        // If no conversations exist, ask the backend to create one
        startNewChat();
    }
    userInput.focus();
    renderHistorySidebar();
}

document.addEventListener('DOMContentLoaded', initializeChat);