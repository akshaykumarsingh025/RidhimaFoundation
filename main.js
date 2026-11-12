(function () {
    'use strict';

    // Hindi page (/hi/) is generated at build time; a few JS-only strings need a Hindi version too.
    var isHi = (document.documentElement.lang || '').indexOf('hi') === 0;
    var T = function (en, hi) { return isHi ? hi : en; };
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
            if (!v) return T('Full name is required', 'पूरा नाम आवश्यक है');
            if (v.length < 2) return T('Name must be at least 2 characters', 'नाम कम से कम 2 अक्षरों का होना चाहिए');
        },
        email: function (v) {
            if (!v) return T('Email address is required', 'ईमेल पता आवश्यक है');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return T('Please enter a valid email address', 'कृपया सही ईमेल पता दर्ज करें');
        },
        phone: function (v) {
            if (!v) return T('Phone number is required', 'फ़ोन नंबर आवश्यक है');
            if (!/^(\+91|91)?[6-9]\d{9}$/.test(v.replace(/[\s\-]/g, ''))) return T('Enter a valid 10-digit Indian mobile number', 'कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें');
        },
        message: function (v) {
            if (!v) return T('Please enter your message', 'कृपया अपना संदेश लिखें');
            if (v.length < 10) return T('Message should be at least 10 characters', 'संदेश कम से कम 10 अक्षरों का होना चाहिए');
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
        submitBtn.querySelector('.label').textContent = T('Sending…', 'भेजा जा रहा है…');
        statusEl.textContent = '';

        fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form) })
            .then(function (res) { return res.json(); })
            .then(function (result) {
                if (result.success) {
                    form.reset();
                    form.classList.add('hidden');
                    success.classList.remove('hidden');
                } else {
                    statusEl.textContent = T('Something went wrong. Please try again or contact us on WhatsApp.', 'कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें या WhatsApp पर संपर्क करें।');
                }
            })
            .catch(function () {
                statusEl.textContent = T('Network error. Please check your connection and try again.', 'नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जाँचें और फिर से कोशिश करें।');
            })
            .then(function () {
                submitBtn.disabled = false;
                submitBtn.querySelector('.label').textContent = T('Send message', 'संदेश भेजें');
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

    // === ROTATING MESSAGES ===
    document.querySelectorAll('[data-rotator]').forEach(function (list) {
        var items = list.children;
        if (items.length < 2) return;
        var i = 0;
        var paused = false;
        var dotsWrap = list.nextElementSibling && list.nextElementSibling.classList.contains('rotator-dots')
            ? list.nextElementSibling : null;
        var dots = [];
        if (dotsWrap) {
            for (var d = 0; d < items.length; d++) {
                dots.push(dotsWrap.appendChild(document.createElement('span')));
            }
        }
        var go = function (n) {
            items[i].classList.remove('is-active');
            if (dots[i]) dots[i].classList.remove('on');
            i = (n + items.length) % items.length;
            items[i].classList.add('is-active');
            if (dots[i]) dots[i].classList.add('on');
        };
        go(0);
        if (reduceMotion) return;
        var host = list.closest('button, .donate') || list;
        host.addEventListener('mouseenter', function () { paused = true; });
        host.addEventListener('mouseleave', function () { paused = false; });
        host.addEventListener('focusin', function () { paused = true; });
        host.addEventListener('focusout', function () { paused = false; });
        setInterval(function () {
            if (!paused && !document.hidden) go(i + 1);
        }, parseInt(list.getAttribute('data-interval'), 10) || 4000);
    });

    // === DONATE MODAL ===
    var modal = document.getElementById('donate-modal');
    var dock = document.querySelector('.donate-dock');
    var openDonate = function () {
        if (modal && typeof modal.showModal === 'function') {
            modal.showModal();
        } else {
            location.hash = '#donate';
        }
    };
    document.querySelectorAll('[data-open-donate]').forEach(function (btn) {
        btn.addEventListener('click', openDonate);
    });
    if (modal) {
        modal.querySelectorAll('[data-close-donate]').forEach(function (el) {
            el.addEventListener('click', function () { modal.close(); });
        });
        // Click on the dimmed backdrop closes the dialog
        modal.addEventListener('click', function (e) {
            if (e.target !== modal) return;
            var r = modal.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close();
        });
    }

    // === FLOATING DONATE DOCK ===
    if (dock) {
        var MIN_KEY = 'rf-dock-min';
        try {
            if (sessionStorage.getItem(MIN_KEY) === '1') dock.classList.add('is-min');
        } catch (e) { /* storage unavailable */ }
        dock.querySelector('.dock-close').addEventListener('click', function () {
            dock.classList.add('is-min');
            try { sessionStorage.setItem(MIN_KEY, '1'); } catch (e) { /* ignore */ }
        });

        // Hide the dock while the donate section (redundant there) or the contact form (it would cover fields) is on screen
        var hideFor = {};
        var syncDock = function () {
            var hide = Object.keys(hideFor).some(function (k) { return hideFor[k]; });
            dock.classList.toggle('is-hidden', hide);
        };
        if ('IntersectionObserver' in window) {
            var dockObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    hideFor[entry.target.id] = entry.isIntersecting;
                });
                syncDock();
            }, { threshold: 0.15 });
            ['donate', 'contact'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) dockObserver.observe(el);
            });
        }
    }

    // === COPY UPI ID ===
    var copyText = function (text) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
        return new Promise(function (resolve, reject) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
            document.body.removeChild(ta);
            if (ok) { resolve(); } else { reject(); }
        });
    };
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
        var label = btn.querySelector('span');
        var original = label.textContent;
        btn.addEventListener('click', function () {
            var src = document.querySelector(btn.getAttribute('data-copy'));
            copyText(src.textContent.trim()).then(function () {
                btn.classList.add('done');
                label.textContent = T('Copied!', 'कॉपी हो गया!');
                setTimeout(function () {
                    btn.classList.remove('done');
                    label.textContent = original;
                }, 2000);
            }, function () {
                var range = document.createRange();
                range.selectNodeContents(src);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            });
        });
    });

    // === SHARE ===
    document.querySelectorAll('[data-share]').forEach(function (btn) {
        var label = btn.querySelector('span');
        var original = label.textContent;
        btn.addEventListener('click', function () {
            var url = location.origin + location.pathname + '#donate';
            var data = {
                title: T('Ridhima Foundation', 'रिधिमा फाउंडेशन'),
                text: T('Ridhima Foundation provides free health care to women in Delhi NCR. Please support them.',
                    'रिधिमा फाउंडेशन दिल्ली एनसीआर में महिलाओं को निःशुल्क स्वास्थ्य सेवा देता है। कृपया उनका साथ दें।'),
                url: url
            };
            if (navigator.share) {
                navigator.share(data).catch(function () { /* cancelled */ });
                return;
            }
            copyText(url).then(function () {
                label.textContent = T('Link copied!', 'लिंक कॉपी हो गया!');
                setTimeout(function () { label.textContent = original; }, 2000);
            });
        });
    });

    // === LANGUAGE SWITCH: keep the reader on the same section ===
    document.querySelectorAll('[data-lang-switch]').forEach(function (a) {
        a.addEventListener('click', function () {
            if (location.hash) a.setAttribute('href', a.getAttribute('href').split('#')[0] + location.hash);
        });
    });

    // === DONOR WALL (reads /donors.json) ===
    var donorList = document.querySelector('[data-donor-list]');
    if (donorList && window.fetch) {
        var SHOW = 12;
        var initials = function (name) {
            var parts = name.trim().split(/\s+/);
            return ((parts[0] || '').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase() || '♥';
        };
        var fmtDate = function (iso) {
            var dt = new Date(iso);
            if (isNaN(dt)) return '';
            return dt.toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', { month: 'short', year: 'numeric' });
        };
        var render = function (donors, all) {
            donorList.textContent = '';
            donors.slice(0, all ? donors.length : SHOW).forEach(function (d) {
                var li = document.createElement('li');
                var av = document.createElement('span');
                av.className = 'donor-avatar';
                av.setAttribute('aria-hidden', 'true');
                av.textContent = initials(d.name);
                var info = document.createElement('span');
                var nm = document.createElement('span');
                nm.className = 'donor-name';
                nm.textContent = isHi && /^anonymous$/i.test(d.name.trim()) ? 'गुमनाम दानदाता' : d.name;
                info.appendChild(nm);
                var meta = [d.city, d.note, d.date ? fmtDate(d.date) : ''].filter(Boolean).join(' · ');
                if (meta) {
                    var mt = document.createElement('span');
                    mt.className = 'donor-meta';
                    mt.textContent = meta;
                    info.appendChild(mt);
                }
                li.appendChild(av);
                li.appendChild(info);
                donorList.appendChild(li);
            });
        };
        fetch('/donors.json', { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : { donors: [] }; })
            .then(function (data) {
                var donors = (data && data.donors || []).filter(function (d) { return d && d.name; });
                if (!donors.length) return;
                document.querySelector('[data-donor-empty]').hidden = true;
                var count = document.querySelector('[data-donor-count]');
                count.querySelector('b').textContent = donors.length.toLocaleString(isHi ? 'hi-IN' : 'en-IN');
                count.hidden = false;
                render(donors, false);
                var more = document.querySelector('[data-donor-more]');
                if (donors.length > SHOW) {
                    more.hidden = false;
                    more.addEventListener('click', function () {
                        render(donors, true);
                        more.hidden = true;
                    });
                }
            })
            .catch(function () { /* keep the empty-state message */ });
    }
})();
