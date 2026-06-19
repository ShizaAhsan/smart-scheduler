(function() {
    // Prevent double injection
    if (document.getElementById('ai-assistant-container')) return;

    // Check directory depth to determine relative API and resource paths
    const isSubdir = window.location.pathname.includes('/admin/') || 
                     window.location.pathname.includes('/student/') || 
                     window.location.pathname.includes('/teacher/');
    const apiPath = isSubdir ? '../api/ai/chat' : 'api/ai/chat';

    // 1. Inject Styles
    const style = document.createElement('style');
    style.innerHTML = `
        /* AI Assistant Widget CSS */
        .ai-widget-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .ai-chat-bubble {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            color: white;
            font-size: 28px;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .ai-chat-bubble:hover {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 6px 24px rgba(124, 58, 237, 0.55);
        }

        .ai-chat-bubble:active {
            transform: scale(0.95);
        }

        .ai-chat-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 380px;
            height: 500px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transform: translateY(20px) scale(0.95);
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .ai-chat-window.open {
            transform: translateY(0) scale(1);
            opacity: 1;
            pointer-events: auto;
        }

        .ai-chat-header {
            padding: 16px;
            background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .ai-chat-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 15px;
        }

        .ai-chat-close {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            font-size: 20px;
            cursor: pointer;
            transition: color 0.2s;
        }

        .ai-chat-close:hover {
            color: white;
        }

        .ai-chat-body {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .ai-msg {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 13.5px;
            line-height: 1.5;
            word-wrap: break-word;
        }

        .ai-msg.user {
            background: #4f46e5;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
            box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
        }

        .ai-msg.bot {
            background: white;
            color: #1e293b;
            align-self: flex-start;
            border-bottom-left-radius: 2px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        }

        .ai-msg.bot p {
            margin: 0 0 8px 0;
        }
        .ai-msg.bot p:last-child {
            margin-bottom: 0;
        }
        .ai-msg.bot ul, .ai-msg.bot ol {
            margin: 4px 0;
            padding-left: 20px;
        }
        .ai-msg.bot li {
            margin-bottom: 4px;
        }

        .ai-chat-footer {
            padding: 12px;
            background: white;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 8px;
        }

        .ai-chat-input {
            flex: 1;
            border: 1px solid #cbd5e1;
            border-radius: 24px;
            padding: 8px 16px;
            font-size: 13px;
            outline: none;
            transition: border-color 0.2s;
        }

        .ai-chat-input:focus {
            border-color: #7c3aed;
        }

        .ai-chat-send {
            background: #4f46e5;
            color: white;
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .ai-chat-send:hover {
            background: #4338ca;
        }

        /* Typing indicator styling */
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 4px 8px;
            align-items: center;
        }
        .typing-dot {
            width: 6px;
            height: 6px;
            background: #94a3b8;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }

        /* Highlight animation for instructions */
        .ai-pulse-dot {
            position: absolute;
            top: -2px;
            right: -2px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #ef4444;
            border: 2px solid white;
            animation: pulse-ring 1.8s infinite;
        }

        @keyframes pulse-ring {
            0% { transform: scale(0.9); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(0.9); opacity: 1; }
        }

        @media (max-width: 480px) {
            .ai-chat-window {
                width: 320px;
                right: -10px;
                height: 420px;
            }
        }
    `;
    document.head.appendChild(style);

    // 2. Inject DOM Elements
    const container = document.createElement('div');
    container.id = 'ai-assistant-container';
    container.className = 'ai-widget-container';

    container.innerHTML = `
        <div class="ai-chat-bubble" id="ai-bubble-btn">
            💬
            <div class="ai-pulse-dot"></div>
        </div>
        <div class="ai-chat-window" id="ai-chat-win">
            <div class="ai-chat-header">
                <div class="ai-chat-title">
                    <span>✨</span>
                    <span>Scheduler AI Assistant</span>
                </div>
                <button class="ai-chat-close" id="ai-close-btn">&times;</button>
            </div>
            <div class="ai-chat-body" id="ai-chat-messages">
                <div class="ai-msg bot">
                    👋 Hello! I am your <strong>Campus Smart Scheduler Assistant</strong>. <br/><br/>
                    Ask me anything about class schedules, room allocations, conflict resolution, or requests! 
                    Type <strong>"help"</strong> to see what I can do.
                </div>
            </div>
            <div class="ai-chat-footer">
                <input type="text" class="ai-chat-input" id="ai-chat-in" placeholder="Ask about schedules or rooms..." />
                <button class="ai-chat-send" id="ai-send-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // 3. Setup Elements & State References
    const bubbleBtn = document.getElementById('ai-bubble-btn');
    const chatWin = document.getElementById('ai-chat-win');
    const closeBtn = document.getElementById('ai-close-btn');
    const sendBtn = document.getElementById('ai-send-btn');
    const chatInput = document.getElementById('ai-chat-in');
    const chatMessages = document.getElementById('ai-chat-messages');

    let isChatOpen = false;

    // Toggle Chat
    bubbleBtn.addEventListener('click', () => {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            chatWin.classList.add('open');
            // Remove pulse dot after first open
            const dot = bubbleBtn.querySelector('.ai-pulse-dot');
            if (dot) dot.remove();
            setTimeout(() => chatInput.focus(), 150);
        } else {
            chatWin.classList.remove('open');
        }
    });

    closeBtn.addEventListener('click', () => {
        isChatOpen = false;
        chatWin.classList.remove('open');
    });

    // Send Message Logic
    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Render User Message
        appendMessage(text, 'user');
        chatInput.value = '';

        // Render Bot Typing Indicator
        const typingId = appendTypingIndicator();

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Fetch AI Response
        fetch(apiPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            removeTypingIndicator(typingId);
            // Render Bot Message
            appendMessage(data.response, 'bot');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        })
        .catch(err => {
            removeTypingIndicator(typingId);
            appendMessage("⚠️ Connection error. Make sure the backend Flask server is running at port 5000.", 'bot');
            chatMessages.scrollTop = chatMessages.scrollHeight;
            console.error(err);
        });
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Markdown Helper (simple parser for bold, lists, and spacing)
    function parseMarkdown(text) {
        // Double newlines to paragraphs
        let html = text;
        
        // Escape HTML to prevent XSS
        html = html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Format bold (**text**)
        html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
        
        // Format italic (*text*)
        html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');

        // Parse lists
        // Unordered lists (bullet points)
        html = html.replace(/^\s*-\s+([\s\S]*?)(?=\n^\s*-\s+|\n\n|\n$|$)/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Simple replacements for headers/divider
        html = html.replace(/^### (.*$)/gim, '<strong>$1</strong>');
        html = html.replace(/^## (.*$)/gim, '<strong>$1</strong>');
        html = html.replace(/^# (.*$)/gim, '<strong>$1</strong>');
        html = html.replace(/\n/g, '<br/>');

        return html;
    }

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-msg ${sender}`;
        
        if (sender === 'bot') {
            msgDiv.innerHTML = parseMarkdown(text);
        } else {
            msgDiv.textContent = text;
        }
        
        chatMessages.appendChild(msgDiv);
        return msgDiv;
    }

    function appendTypingIndicator() {
        const indDiv = document.createElement('div');
        indDiv.className = 'ai-msg bot typing-indicator';
        indDiv.id = 'ai-typing-indicator';
        indDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        chatMessages.appendChild(indDiv);
        return indDiv.id;
    }

    function removeTypingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) indicator.remove();
    }
})();
