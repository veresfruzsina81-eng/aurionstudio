<script>
    // Hamburger
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');

    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            mobileNav.classList.toggle('show');
        });

        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open');
                mobileNav.classList.remove('show');
            });
        });
    }

    // Scroll animáció
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

    // === CHAT LOGIKA – API hívás + 10 üzenet limit ===

    const chatWindow = document.getElementById('chatWindow');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');

    let messageCount = 0;
    const MAX_MESSAGES = 10;

    function addMessage(text, role = 'user') {
        if (!chatWindow) return null;
        const msg = document.createElement('div');
        msg.classList.add('chat-message');
        if (role === 'user') {
            msg.classList.add('user');
        } else {
            msg.classList.add('bot');
        }
        msg.textContent = text;
        chatWindow.appendChild(msg);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return msg;
    }

    function showLimitReached() {
        addMessage(
            'Ebben a demó chatben 10 üzenet után lezárjuk a beszélgetést, ' +
            'hogy védjük az AI erőforrásokat. Ha szeretnél saját, korlátlan AI asszisztenst, írj az ajánlatkérő űrlapon keresztül.',
            'bot'
        );
        if (chatInput) chatInput.disabled = true;
        if (chatSendBtn) chatSendBtn.disabled = true;
    }

    async function callBackend(userText) {
        // „gépelés” placeholder
        const thinkingBubble = addMessage('Gondolkodom a válaszon…', 'bot');

        try {
            const res = await fetch('/.netlify/functions/aurion-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    count: messageCount
                }),
            });

            if (!res.ok) {
                // ha a function limitet dob
                if (res.status === 429) {
                    const data = await res.json().catch(() => ({}));
                    if (thinkingBubble) {
                        thinkingBubble.textContent =
                            data.message ||
                            'Ebben a demó chatben elértük az üzenetlimitet. Ha szeretnél saját AI asszisztenst, jelezd nekünk.';
                    }
                    showLimitReached();
                    return;
                }

                throw new Error('Hibás HTTP státusz: ' + res.status);
            }

            const data = await res.json();
            const reply = (data && data.reply) ? data.reply : '';

            if (thinkingBubble) {
                thinkingBubble.textContent = reply || 'Jelenleg nem érkezett válasz a motortól.';
            }
        } catch (err) {
            console.error('Chat hiba:', err);
            if (thinkingBubble) {
                thinkingBubble.textContent =
                    'Most nem tudom elérni a chat motort. ' +
                    'Valószínűleg technikai probléma van – próbáld meg egy kicsit később, ' +
                    'vagy írj közvetlenül az ajánlatkérő űrlapon.';
            }
        }
    }

    function handleUserSend() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        if (messageCount >= MAX_MESSAGES) {
            showLimitReached();
            return;
        }

        // növeljük a számlálót és kirakjuk a user üzenetet
        messageCount += 1;
        addMessage(text, 'user');
        chatInput.value = '';

        // backend hívás
        callBackend(text);
    }

    if (chatSendBtn && chatInput) {
        chatSendBtn.addEventListener('click', handleUserSend);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUserSend();
            }
        });
    }
</script>
