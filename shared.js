// CJ's Liquors — shared behaviour (header, nav, search, scroll reveal)
// Used by index.html and shop.html.
let revealObserver;

    // ── STICKY HEADER ────────────────────────────────────────────────
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });

    // ── HAMBURGER MENU ───────────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');

    function closeMobileNav() {
        mobileNav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open menu');
        mobileNav.setAttribute('aria-hidden', 'true');
        const [s1, s2, s3] = hamburger.querySelectorAll('span');
        s1.style.transform = s3.style.transform = '';
        s2.style.opacity = '';
    }

    hamburger.addEventListener('click', () => {
        const open = mobileNav.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', String(open));
        hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        mobileNav.setAttribute('aria-hidden', String(!open));
        const [s1, s2, s3] = hamburger.querySelectorAll('span');
        if (open) {
            s1.style.transform = 'rotate(45deg) translate(5px,5px)';
            s2.style.opacity   = '0';
            s3.style.transform = 'rotate(-45deg) translate(5px,-5px)';
            // Close search panel if open
            const panel = document.getElementById('nav-search-panel');
            const toggle = document.getElementById('nav-srch-toggle');
            if (panel) panel.classList.remove('open');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
        } else {
            s1.style.transform = s3.style.transform = '';
            s2.style.opacity = '';
        }
    });

    // Close mobile nav whenever any link inside it is tapped
    mobileNav.addEventListener('click', e => {
        if (e.target.closest('a')) closeMobileNav();
    });

    // ── NAV SEARCH ───────────────────────────────────────────────────
    const navSrchToggle  = document.getElementById('nav-srch-toggle');
    const navSearchPanel = document.getElementById('nav-search-panel');
    const navSearchInput = document.getElementById('nav-search-input');
    const navSearchMob   = document.getElementById('nav-search-mobile');
    const navSearchX     = document.getElementById('nav-search-x');
    const navSearchXMob  = document.getElementById('nav-search-x-mob');

    const ON_SHOP = !!document.getElementById('prod-grid');

    function scrollToProducts() {
        const section = document.getElementById('products');
        if (!section) return;
        const hdrH = (document.getElementById('header') || {}).offsetHeight || 68;
        const targetY = section.offsetTop - hdrH - 8;
        if (window.pageYOffset < targetY) {
            window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
    }

    // On the shop page the header search filters live. Elsewhere it sends the visitor to the shop page.
    function handleNavSearch(input) {
        if (input.value.trim()) scrollToProducts();
        onSearch(input.value);
    }
    [navSearchInput, navSearchMob].forEach(input => {
        if (!input) return;
        if (ON_SHOP) {
            input.addEventListener('input', () => handleNavSearch(input));
        } else {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' && input.value.trim()) {
                    e.preventDefault();
                    window.location.href = 'shop.html?q=' + encodeURIComponent(input.value.trim());
                }
            });
        }
    });
    navSearchX     && navSearchX.addEventListener('click',     () => { if (ON_SHOP) clearSearch(); else navSearchInput.value = ''; });
    navSearchXMob  && navSearchXMob.addEventListener('click',  () => { if (ON_SHOP) clearSearch(); else navSearchMob.value = ''; navSearchMob && navSearchMob.focus(); });

    navSrchToggle && navSrchToggle.addEventListener('click', () => {
        const open = navSearchPanel.classList.toggle('open');
        navSrchToggle.setAttribute('aria-expanded', open);
        if (open) {
            // Close hamburger menu if open
            if (mobileNav.classList.contains('open')) {
                mobileNav.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
            }
            setTimeout(() => navSearchMob && navSearchMob.focus(), 120);
        }
    });

    // ── SCROLL REVEAL ────────────────────────────────────────────────
    revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ── ACTIVE NAV ON SCROLL ─────────────────────────────────────────
    if (document.body.dataset.page === 'shop') {
        document.querySelectorAll('.primary-nav > li > a[href="shop.html"]').forEach(a => a.classList.add('active'));
    }
    const secs = [...document.querySelectorAll('section[id]')];
    const navAs = [...document.querySelectorAll('.primary-nav > li > a')];
    window.addEventListener('scroll', () => {
        let cur = '';
        secs.forEach(s => { if (window.scrollY >= s.offsetTop - 110) cur = s.id; });
        if (document.body.dataset.page === 'shop') return;
        navAs.forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === `#${cur}`);
        });
    }, { passive: true });

    // ── DROPDOWN KEYBOARD NAVIGATION ─────────────────────────────────
    const ddTriggers = [...document.querySelectorAll('.primary-nav .nav-btn[aria-haspopup]')];

    function openDropdown(trigger) {
        closeAllDropdowns(trigger);
        trigger.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown(trigger) {
        trigger.setAttribute('aria-expanded', 'false');
    }

    function closeAllDropdowns(except) {
        ddTriggers.forEach(t => { if (t !== except) closeDropdown(t); });
    }

    function getItems(trigger) {
        const dd = document.getElementById(trigger.getAttribute('aria-controls'));
        return dd ? [...dd.querySelectorAll('a[role="menuitem"]')] : [];
    }

    ddTriggers.forEach(trigger => {
        // Click: toggle open/close
        trigger.addEventListener('click', () => {
            const expanded = trigger.getAttribute('aria-expanded') === 'true';
            if (expanded) closeDropdown(trigger);
            else openDropdown(trigger);
        });

        // Keyboard on the trigger button
        trigger.addEventListener('keydown', e => {
            const items = getItems(trigger);
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const expanded = trigger.getAttribute('aria-expanded') === 'true';
                if (expanded) closeDropdown(trigger);
                else { openDropdown(trigger); items[0]?.focus(); }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                openDropdown(trigger);
                items[0]?.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                openDropdown(trigger);
                items[items.length - 1]?.focus();
            } else if (e.key === 'Escape') {
                closeDropdown(trigger);
            }
        });
    });

    // Keyboard within dropdown items
    document.querySelectorAll('.dropdown[role="menu"]').forEach(menu => {
        menu.addEventListener('keydown', e => {
            const items = [...menu.querySelectorAll('a[role="menuitem"]')];
            const idx   = items.indexOf(document.activeElement);
            const triggerId = menu.getAttribute('aria-labelledby');
            const trigger   = triggerId ? document.getElementById(triggerId) : null;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                items[(idx + 1) % items.length]?.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                items[(idx - 1 + items.length) % items.length]?.focus();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (trigger) { closeDropdown(trigger); trigger.focus(); }
            } else if (e.key === 'Tab') {
                // Let Tab flow naturally but close the dropdown
                if (trigger) closeDropdown(trigger);
            } else if (e.key === 'Home') {
                e.preventDefault();
                items[0]?.focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                items[items.length - 1]?.focus();
            }
        });
    });

    // Click outside closes all dropdowns
    document.addEventListener('click', e => {
        if (!e.target.closest('.primary-nav li')) closeAllDropdowns(null);
    });

    // Clicking a link inside a dropdown closes it
    document.querySelectorAll('.dropdown a[role="menuitem"]').forEach(link => {
        link.addEventListener('click', () => closeAllDropdowns(null));
    });

