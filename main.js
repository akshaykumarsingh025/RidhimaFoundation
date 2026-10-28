(function () {
    'use strict';

    // === NAV: scrolled state, mobile menu, active link ===
    var nav = document.querySelector('.nav');
    var onScroll = function () {
        nav.classList.toggle('scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var toggle = document.querySelector('.menu-toggle');
    var setMenu = function (open) {
        document.body.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', function () {
        setMenu(!document.body.classList.contains('menu-open'));
    });
    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
        a.addEventListener('click', function () { setMenu(false); });
    });

    var navLinks = document.querySelectorAll('.nav-links a');
    if ('IntersectionObserver' in window) {
        var sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                navLinks.forEach(function (a) {
                    a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        navLinks.forEach(function (a) {
            var target = document.querySelector(a.getAttribute('href'));
            if (target) sectionObserver.observe(target);
        });
    }

    // === SCROLL REVEAL ===
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach(function (el) { revealObserver.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add('in'); });
    }

    // === ANIMATED COUNTERS ===
    var counters = document.querySelectorAll('.counter');
    var runCounter = function (el) {
        var target = parseInt(el.getAttribute('data-target'), 10);
        var suffix = el.getAttribute('data-suffix') || '';
        var start = null;
        var duration = 1800;
        var step = function (ts) {
            if (!start) start = ts;
            var p = Math.min(1, (ts - start) / duration);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased).toLocaleString('en-IN') + suffix;
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
        var counterObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    runCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        counters.forEach(function (el) { counterObserver.observe(el); });
    }

    // === LIGHTBOX ===
    var lightbox = document.getElementById('lightbox');
    var lbImg = lightbox.querySelector('img');
    var lbCount = lightbox.querySelector('.lb-count');
    var items = [];
    var current = 0;
    var lastFocus = null;

    var show = function (i) {
        current = (i + items.length) % items.length;
        var img = items[current].querySelector('img');
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCount.textContent = (current + 1) + ' / ' + items.length;
    };
    var openLightbox = function (btn) {
        var group = btn.getAttribute('data-group');
        items = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox][data-group="' + group + '"]'));
        lastFocus = btn;
        show(items.indexOf(btn));
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
        lightbox.querySelector('.lb-close').focus();
    };
    var closeLightbox = function () {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
        lbImg.removeAttribute('src');
        if (lastFocus) lastFocus.focus();
    };

    document.querySelectorAll('[data-lightbox]').forEach(function (btn) {
        btn.addEventListener('click', function () { openLightbox(btn); });
    });
    lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(current - 1); });
    lightbox.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(current + 1); });
    lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (lightbox.classList.contains('open')) closeLightbox();
            else if (document.body.classList.contains('menu-open')) setMenu(false);
        }
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'ArrowLeft') show(current - 1);
        if (e.key === 'ArrowRight') show(current + 1);
    });

    // === CONTACT FORM (Web3Forms) ===
    var form = document.getElementById('contact-form');
    var success = document.getElementById('form-success');
    var statusEl = form.querySelector('.form-status');
    var submitBtn = form.querySelector('button[type="submit"]');

    var rules = {
        name: function (v) {
            if (!v) return 'Full name is required';
            if (v.length < 2) return 'Name must be at least 2 characters';
        },
        email: function (v) {
            if (!v) return 'Email address is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Please enter a valid email address';
        },
        phone: function (v) {
            if (!v) return 'Phone number is required';
            if (!/^(\+91|91)?[6-9]\d{9}$/.test(v.replace(/[\s\-]/g, ''))) return 'Enter a valid 10-digit Indian mobile number';
        },
        message: function (v) {
            if (!v) return 'Please enter your message';
            if (v.length < 10) return 'Message should be at least 10 characters';
        }
    };

    var validate = function (name) {
        var input = form.elements[name];
        var msg = rules[name](input.value.trim());
        var field = input.closest('.field');
        field.classList.toggle('has-error', !!msg);
        field.querySelector('.error').textContent = msg || '';
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
        return !msg;
    };

    Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        input.addEventListener('blur', function () { validate(name); });
        input.addEventListener('input', function () {
            if (input.closest('.field').classList.contains('has-error')) validate(name);
        });
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = Object.keys(rules).map(validate).every(Boolean);
        if (!ok) {
            var firstBad = form.querySelector('.has-error input, .has-error textarea');
            if (firstBad) firstBad.focus();
            return;
        }
        submitBtn.disabled = true;
        submitBtn.querySelector('.label').textContent = 'Sending…';
        statusEl.textContent = '';

        fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form) })
            .then(function (res) { return res.json(); })
            .then(function (result) {
                if (result.success) {
                    form.reset();
                    form.classList.add('hidden');
                    success.classList.remove('hidden');
                } else {
                    statusEl.textContent = 'Something went wrong. Please try again or contact us on WhatsApp.';
                }
            })
            .catch(function () {
                statusEl.textContent = 'Network error. Please check your connection and try again.';
            })
            .then(function () {
                submitBtn.disabled = false;
                submitBtn.querySelector('.label').textContent = 'Send message';
            });
    });

    document.getElementById('send-another').addEventListener('click', function () {
        success.classList.add('hidden');
        form.classList.remove('hidden');
        form.elements.name.focus();
    });

    // Pre-select a topic when a CTA links to #contact with data-topic
    document.querySelectorAll('[data-topic]').forEach(function (a) {
        a.addEventListener('click', function () {
            form.elements.inquiry_type.value = a.getAttribute('data-topic');
        });
    });
})();
