// CJ's Liquors — home page (corporate orders form, party calculator)
    // ── CORPORATE ORDERS FORM ────────────────────────────────────────
    const CORP_REQUIRED = [
        { id: 'corp-company', label: 'Company Name' },
        { id: 'corp-contact', label: 'Contact Name' },
        { id: 'corp-email',   label: 'Email Address' },
        { id: 'corp-phone',   label: 'Phone Number' },
        { id: 'corp-budget',  label: 'Budget Range'  },
    ];

    // Clear aria-invalid when the user corrects a field
    CORP_REQUIRED.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => el.removeAttribute('aria-invalid'));
    });

    function setCorpError(el, msg) {
        const errEl = document.getElementById('corp-form-err');
        el.setAttribute('aria-invalid', 'true');
        errEl.textContent = msg;
        errEl.style.display = 'block';
        el.focus();
    }

    function clearCorpErrors() {
        const errEl = document.getElementById('corp-form-err');
        errEl.textContent = '';
        errEl.style.display = 'none';
        CORP_REQUIRED.forEach(({ id }) => {
            document.getElementById(id)?.removeAttribute('aria-invalid');
        });
    }

    async function submitCorpForm(e) {
        e.preventDefault();
        clearCorpErrors();
        const btn = document.getElementById('corp-submit-btn');

        for (const { id, label } of CORP_REQUIRED) {
            const el = document.getElementById(id);
            if (!el.value.trim()) {
                setCorpError(el, `${label} is required.`);
                return;
            }
        }

        const emailEl = document.getElementById('corp-email');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
            setCorpError(emailEl, 'Email Address is not valid. Please enter a valid address (e.g. name@example.com).');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Sending…';

        const formData = {
            access_key: document.getElementById('corp-access-key').value,
            subject: 'New Corporate Order Inquiry — CJ\'s Liquors',
            from_name: 'CJ\'s Liquors Website',
            'Company Name': document.getElementById('corp-company').value.trim(),
            'Contact Name': document.getElementById('corp-contact').value.trim(),
            'Email': document.getElementById('corp-email').value.trim(),
            'Phone': document.getElementById('corp-phone').value.trim(),
            'Event Date': document.getElementById('corp-date').value || 'Not specified',
            'Guest Count': document.getElementById('corp-guests').value || 'Not specified',
            'Budget Range': document.getElementById('corp-budget').value,
            'Notes': document.getElementById('corp-notes').value.trim() || 'None',
        };

        try {
            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('corp-form-body').style.display = 'none';
                document.getElementById('corp-success').classList.add('show');
            } else {
                btn.disabled = false;
                btn.textContent = 'Send Inquiry →';
                const errEl = document.getElementById('corp-form-err');
                errEl.textContent = 'There was a problem sending your inquiry. Please call us directly at (510) 656-6367.';
                errEl.style.display = 'block';
            }
        } catch {
            btn.disabled = false;
            btn.textContent = 'Send Inquiry →';
            const errEl = document.getElementById('corp-form-err');
            errEl.textContent = 'Network error — please call us at (510) 656-6367 or try again.';
            errEl.style.display = 'block';
        }
    }

    // ── PARTY DRINK CALCULATOR ───────────────────────────────────────
    const calcLocks = { wine: false, spirits: false, beer: false };
    const calcKeys  = ['wine', 'spirits', 'beer'];

    function toggleLock(key) {
        calcLocks[key] = !calcLocks[key];
        const btn = document.getElementById('lock-' + key);
        if (btn) {
            btn.classList.toggle('locked', calcLocks[key]);
            btn.setAttribute('aria-pressed', String(calcLocks[key]));
            btn.setAttribute('aria-label', (calcLocks[key] ? 'Unlock' : 'Lock') + ' ' + key + ' percentage');
        }
    }

    function onSlider(moved, rawVal) {
        let val = Math.min(100, Math.max(0, parseInt(rawVal) || 0));
        const others = calcKeys.filter(k => k !== moved && !calcLocks[k]);

        if (others.length === 0) {
            // all others locked — clamp moved to whatever slack remains
            const lockedSum = calcKeys.filter(k => k !== moved).reduce((s, k) => s + getSliderVal(k), 0);
            val = Math.min(val, 100 - lockedSum);
            setSlider(moved, val);
        } else {
            setSlider(moved, val);
            // distribute remainder among unlocked others proportionally
            const lockedSum = calcKeys.filter(k => calcLocks[k] && k !== moved).reduce((s, k) => s + getSliderVal(k), 0);
            let remainder = Math.max(0, 100 - val - lockedSum);
            const prevSum = others.reduce((s, k) => s + getSliderVal(k), 0);
            if (prevSum === 0) {
                const each = Math.floor(remainder / others.length);
                others.forEach((k, i) => setSlider(k, i === others.length - 1 ? remainder - each * (others.length - 1) : each));
            } else {
                let assigned = 0;
                others.forEach((k, i) => {
                    const share = i === others.length - 1
                        ? remainder - assigned
                        : Math.round(remainder * getSliderVal(k) / prevSum);
                    setSlider(k, share);
                    assigned += share;
                });
            }
            // fix rounding so total is exactly 100
            const total = calcKeys.reduce((s, k) => s + getSliderVal(k), 0);
            if (total !== 100 && others.length > 0) {
                const last = others[others.length - 1];
                setSlider(last, Math.max(0, getSliderVal(last) + (100 - total)));
            }
        }
        calcLive();
    }

    function getSliderVal(key) {
        return parseInt(document.getElementById('calc-' + key + '-range').value) || 0;
    }

    function setSlider(key, val) {
        val = Math.min(100, Math.max(0, val));
        const input = document.getElementById('calc-' + key + '-range');
        input.value = val;
        input.setAttribute('aria-valuenow', val);
        input.setAttribute('aria-valuetext', val + '% ' + key);
        const disp = document.getElementById('cv-' + key);
        if (disp) disp.textContent = val;
    }

    function calcLive() {
        const guests = parseInt(document.getElementById('calc-guests').value) || 0;
        const hours  = parseFloat(document.getElementById('calc-hours-range').value) || 3;
        const wPct   = getSliderVal('wine') / 100;
        const sPct   = getSliderVal('spirits') / 100;
        const bPct   = getSliderVal('beer') / 100;
        const champOn = document.getElementById('calc-champagne').checked;

        // update hour display and ARIA
        const hDisp  = document.getElementById('cv-hours');
        if (hDisp) hDisp.textContent = hours;
        const hRange = document.getElementById('calc-hours-range');
        if (hRange) {
            hRange.setAttribute('aria-valuenow',  hours);
            hRange.setAttribute('aria-valuetext', hours + (hours === 1 ? ' hour' : ' hours'));
        }

        // 1.5 drinks/person/hour, 15% buffer
        const dph   = 1.5;
        const total = Math.max(0, Math.ceil(guests * hours * dph * 1.15));
        const perG  = guests > 0 ? (total / guests).toFixed(1) : 0;

        const wDrinks = Math.ceil(total * wPct);
        const sDrinks = Math.ceil(total * sPct);
        const bDrinks = Math.ceil(total * bPct);

        const wBottles = Math.max(0, Math.ceil(wDrinks / 5));   // 5 glasses/750 ml
        const sBottles = Math.max(0, Math.ceil(sDrinks / 17));  // 17 x 1.5 oz shots/750 ml
        const bPacks   = Math.max(0, Math.ceil(bDrinks / 6));   // 6-pack

        const champBottles = champOn ? Math.ceil(guests / 5) : 0;

        setText('r-total',     total);
        setText('r-per-guest', perG);
        setText('r-wine',      wBottles);
        setText('r-spirits',   sBottles);
        setText('r-beer',      bPacks);

        const champRow = document.getElementById('r-champ-row');
        if (champRow) champRow.style.display = champOn ? '' : 'none';
        setText('r-champ', champBottles);
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // init slider display values
    ['wine', 'spirits', 'beer'].forEach(k => {
        const disp = document.getElementById('cv-' + k);
        if (disp) disp.textContent = getSliderVal(k);
    });
    calcLive();
