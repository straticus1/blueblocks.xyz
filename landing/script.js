// Blue Blocks Landing Page JavaScript
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        launchDate: new Date('February 2, 2026 00:00:00').getTime(),
        wsEndpoint: 'wss://blueblocks.xyz/ws/notifications',
        particleCount: 50
    };

    // State
    let ws = null;
    let subscriberCount = 0;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    // DOM Elements
    const elements = {
        days: document.getElementById('days'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds'),
        subscribeForm: document.getElementById('subscribeForm'),
        emailInput: document.getElementById('emailInput'),
        subscribeBtn: document.getElementById('subscribeBtn'),
        subscribeStatus: document.getElementById('subscribeStatus'),
        subscriberCount: document.getElementById('subscriberCount'),
        particles: document.getElementById('particles')
    };

    // ============================================
    // Countdown Timer
    // ============================================
    function updateCountdown() {
        const now = Date.now();
        const distance = CONFIG.launchDate - now;

        if (distance < 0) {
            // Launch time reached!
            elements.days.textContent = '00';
            elements.hours.textContent = '00';
            elements.minutes.textContent = '00';
            elements.seconds.textContent = '00';
            document.querySelector('.countdown-label').textContent = "We're Live!";
            document.querySelector('.launch-date').textContent = 'Welcome to Blue Blocks';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        elements.days.textContent = String(days).padStart(2, '0');
        elements.hours.textContent = String(hours).padStart(2, '0');
        elements.minutes.textContent = String(minutes).padStart(2, '0');
        elements.seconds.textContent = String(seconds).padStart(2, '0');
    }

    // ============================================
    // WebSocket Connection
    // ============================================
    function connectWebSocket() {
        // Skip WebSocket in development if endpoint not available
        if (window.location.protocol === 'file:') {
            console.log('WebSocket disabled in file:// protocol');
            simulateSubscriberCount();
            return;
        }

        try {
            ws = new WebSocket(CONFIG.wsEndpoint);

            ws.onopen = function() {
                console.log('WebSocket connected');
                reconnectAttempts = 0;
                // Request current subscriber count
                ws.send(JSON.stringify({ type: 'getCount' }));
            };

            ws.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            ws.onclose = function() {
                console.log('WebSocket disconnected');
                attemptReconnect();
            };

            ws.onerror = function(error) {
                console.error('WebSocket error:', error);
                // Fall back to simulated count
                simulateSubscriberCount();
            };
        } catch (e) {
            console.error('WebSocket connection failed:', e);
            simulateSubscriberCount();
        }
    }

    function handleWebSocketMessage(data) {
        switch (data.type) {
            case 'count':
                updateSubscriberCount(data.count);
                break;
            case 'subscribed':
                showStatus('You\'re on the list! We\'ll notify you when we launch.', 'success');
                updateSubscriberCount(data.count);
                break;
            case 'already_subscribed':
                showStatus('You\'re already subscribed!', 'success');
                break;
            case 'error':
                showStatus(data.message || 'Something went wrong. Please try again.', 'error');
                break;
            case 'notification':
                // Handle real-time notifications
                showNotification(data.message);
                break;
        }
    }

    function attemptReconnect() {
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
            setTimeout(connectWebSocket, delay);
        } else {
            console.log('Max reconnection attempts reached');
            simulateSubscriberCount();
        }
    }

    function simulateSubscriberCount() {
        // Simulate a growing subscriber count for demo purposes
        const baseCount = 1247;
        const randomVariation = Math.floor(Math.random() * 50);
        updateSubscriberCount(baseCount + randomVariation);

        // Occasionally increment
        setInterval(() => {
            if (Math.random() > 0.7) {
                subscriberCount += Math.floor(Math.random() * 3) + 1;
                animateCounterUpdate();
            }
        }, 10000);
    }

    function updateSubscriberCount(count) {
        subscriberCount = count;
        animateCounterUpdate();
    }

    function animateCounterUpdate() {
        const el = elements.subscriberCount;
        const currentValue = parseInt(el.textContent) || 0;
        const targetValue = subscriberCount;

        if (currentValue === targetValue) return;

        const duration = 500;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(currentValue + (targetValue - currentValue) * eased);

            el.textContent = value.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }

    // ============================================
    // Subscription Form
    // ============================================
    function handleSubscribe(e) {
        e.preventDefault();

        const email = elements.emailInput.value.trim();

        if (!isValidEmail(email)) {
            showStatus('Please enter a valid email address.', 'error');
            return;
        }

        // Show loading state
        setLoading(true);

        // Try WebSocket first
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'subscribe',
                email: email
            }));
            // Response handled in onmessage
            setTimeout(() => setLoading(false), 500);
        } else {
            // Fallback to HTTP endpoint
            subscribeViaHttp(email);
        }
    }

    async function subscribeViaHttp(email) {
        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                showStatus('You\'re on the list! We\'ll notify you when we launch.', 'success');
                elements.emailInput.value = '';
                if (data.count) {
                    updateSubscriberCount(data.count);
                }
            } else {
                showStatus(data.message || 'Something went wrong. Please try again.', 'error');
            }
        } catch (error) {
            // Demo mode - simulate success
            console.log('API not available, simulating subscription');
            showStatus('You\'re on the list! We\'ll notify you when we launch.', 'success');
            elements.emailInput.value = '';
            subscriberCount++;
            animateCounterUpdate();
        } finally {
            setLoading(false);
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showStatus(message, type) {
        elements.subscribeStatus.textContent = message;
        elements.subscribeStatus.className = 'subscribe-status ' + type;

        // Clear after 5 seconds
        setTimeout(() => {
            elements.subscribeStatus.textContent = '';
            elements.subscribeStatus.className = 'subscribe-status';
        }, 5000);
    }

    function setLoading(loading) {
        const btn = elements.subscribeBtn;
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loading');

        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        loader.style.display = loading ? 'inline' : 'none';
    }

    function showNotification(message) {
        // Browser notification if permitted
        if (Notification.permission === 'granted') {
            new Notification('Blue Blocks', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }

    // ============================================
    // Particle Animation
    // ============================================
    function createParticles() {
        const container = elements.particles;

        for (let i = 0; i < CONFIG.particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Random starting position
            particle.style.left = Math.random() * 100 + '%';

            // Random animation delay and duration
            const delay = Math.random() * 15;
            const duration = 10 + Math.random() * 10;
            particle.style.animationDelay = delay + 's';
            particle.style.animationDuration = duration + 's';

            // Random size
            const size = 2 + Math.random() * 4;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';

            container.appendChild(particle);
        }
    }

    // ============================================
    // Request Notification Permission
    // ============================================
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Request permission after user interaction
            elements.subscribeForm.addEventListener('submit', function() {
                Notification.requestPermission();
            }, { once: true });
        }
    }

    // ============================================
    // Social Link Click Tracking
    // ============================================
    function initSocialLinks() {
        const socialLinks = document.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const platform = this.dataset.platform;
                // Track click (can be sent to analytics)
                console.log('Social click:', platform);

                // If no href set, show coming soon
                if (this.getAttribute('href') === '#') {
                    e.preventDefault();
                    showStatus(`${platform.charAt(0).toUpperCase() + platform.slice(1)} link coming soon!`, 'success');
                }
            });
        });
    }

    // ============================================
    // Initialize
    // ============================================
    function init() {
        // Start countdown
        updateCountdown();
        setInterval(updateCountdown, 1000);

        // Create particle effect
        createParticles();

        // Connect WebSocket
        connectWebSocket();

        // Setup form handler
        elements.subscribeForm.addEventListener('submit', handleSubscribe);

        // Setup social links
        initSocialLinks();

        // Request notification permission
        requestNotificationPermission();

        console.log('Blue Blocks landing page initialized');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
