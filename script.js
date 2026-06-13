/* ===== Фавиконки ===== */
function faviconUrl(u) { return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(u)}&sz=64`; }
function addIcon(link) {
    if (link.querySelector(".site-icon")) return;
    const img = document.createElement("img");
    img.className = "site-icon"; img.src = faviconUrl(link.href);
    img.alt = ""; img.loading = "lazy"; img.width = 22; img.height = 22;
    img.setAttribute("aria-hidden", "true");
    link.prepend(img);
}
const tiles = Array.from(document.querySelectorAll("a.tile[href]"));
tiles.forEach(addIcon);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===== Появление плиток (стаггер) ===== */
(function () {
    const main = document.querySelector("main");
    if (!main) return;
    if (reduceMotion) { main.classList.add("no-anim"); return; }
    main.classList.add("reveal");
    tiles.forEach((t, i) => { t.style.animationDelay = Math.min(i * 18, 600) + "ms"; });
})();

/* ===== Свечение под курсором ===== */
if (!reduceMotion) {
    document.querySelectorAll(".tile-grid").forEach((grid) => {
        let raf = null, tile = null, x = 0, y = 0;
        grid.addEventListener("pointermove", (e) => {
            const t = e.target.closest(".tile");
            if (!t) return;
            tile = t;
            const r = t.getBoundingClientRect();
            x = e.clientX - r.left; y = e.clientY - r.top;
            if (!raf) raf = requestAnimationFrame(() => {
                raf = null;
                if (tile) { tile.style.setProperty("--mx", x + "px"); tile.style.setProperty("--my", y + "px"); }
            });
        });
    });
}

/* ===== Тема ===== */
(function () {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    function apply(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        toggle.textContent = theme === "dark" ? "☀️" : "🌙";
        if (meta) meta.setAttribute("content", theme === "dark" ? "#070a14" : "#eaf0fb");
    }
    apply(document.documentElement.getAttribute("data-theme") || "dark");
    toggle.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        localStorage.setItem("theme", next); apply(next);
    });
})();

/* ===== Мультипоиск ===== */
(function () {
    const form = document.getElementById("search-form");
    const engine = document.getElementById("engine");
    const query = document.getElementById("search-query");
    if (!form) return;
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = query.value.trim();
        if (!q) { query.focus(); return; }
        window.open(engine.value + encodeURIComponent(q), "_blank", "noopener");
    });
})();

/* ===== Приветствие + часы ===== */
(function () {
    const g = document.getElementById("greeting"), c = document.getElementById("clock");
    if (!c) return;
    const days = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
    const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
    const greet = (h) => h>=5&&h<12 ? "Доброе утро" : h>=12&&h<18 ? "Добрый день" : h>=18&&h<23 ? "Добрый вечер" : "Доброй ночи";
    function tick() {
        const d = new Date();
        if (g) g.textContent = greet(d.getHours());
        const hh = String(d.getHours()).padStart(2,"0"), mm = String(d.getMinutes()).padStart(2,"0");
        c.textContent = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
    }
    tick(); setInterval(tick, 15000);
})();

/* ===== Командная палитра ===== */
(function () {
    const overlay = document.getElementById("palette");
    const input = document.getElementById("palette-input");
    const list = document.getElementById("palette-list");
    const openBtn = document.getElementById("palette-open");
    if (!overlay || !input || !list) return;

    const items = tiles.map((t) => ({
        label: t.dataset.label || t.textContent.trim(),
        href: t.href,
        cat: t.closest(".panel")?.dataset.cat || "",
        icon: faviconUrl(t.href)
    }));

    let results = [], active = 0;

    function score(label, q) {
        label = label.toLowerCase();
        if (label.startsWith(q)) return 0;
        const idx = label.indexOf(q);
        if (idx > -1) return 1 + idx / 100;
        // подпоследовательность
        let i = 0;
        for (const ch of label) { if (ch === q[i]) i++; if (i === q.length) return 3; }
        return 99;
    }

    function render() {
        const q = input.value.trim().toLowerCase();
        if (!q) {
            results = items.slice(0, 8);
        } else {
            results = items.map((it) => ({ it, s: score(it.label, q) }))
                .filter((r) => r.s < 90).sort((a, b) => a.s - b.s).slice(0, 8).map((r) => r.it);
        }
        active = 0;
        let html = "";
        results.forEach((r, i) => {
            html += `<li class="palette-item${i===0?" active":""}" role="option" data-i="${i}">
                <img src="${r.icon}" alt="" loading="lazy"><span class="pi-label">${r.label}</span>
                <span class="pi-cat">${r.cat}</span></li>`;
        });
        if (q) {
            const eng = document.getElementById("engine");
            const engName = eng.options[eng.selectedIndex].text;
            html += `<li class="palette-item web" role="option" data-web="1" data-i="${results.length}">
                <span class="pi-icon">⌕</span><span class="pi-label">Искать «${input.value.trim()}» в ${engName}</span></li>`;
        }
        if (!html) html = `<li class="palette-empty">Ничего не найдено</li>`;
        list.innerHTML = html;
    }

    function move(d) {
        const els = list.querySelectorAll(".palette-item");
        if (!els.length) return;
        els[active]?.classList.remove("active");
        active = (active + d + els.length) % els.length;
        els[active].classList.add("active");
        els[active].scrollIntoView({ block: "nearest" });
    }

    function choose(i) {
        const els = list.querySelectorAll(".palette-item");
        const el = els[i] ?? els[active];
        if (!el) return;
        if (el.dataset.web) {
            const eng = document.getElementById("engine");
            window.open(eng.value + encodeURIComponent(input.value.trim()), "_blank", "noopener");
        } else {
            const r = results[Number(el.dataset.i)];
            if (r) window.open(r.href, "_blank", "noopener");
        }
        close();
    }

    function open() {
        overlay.hidden = false; input.value = ""; render();
        requestAnimationFrame(() => input.focus());
    }
    function close() { overlay.hidden = true; }

    input.addEventListener("input", render);
    input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        else if (e.key === "Enter") { e.preventDefault(); choose(active); }
        else if (e.key === "Escape") { close(); }
    });
    list.addEventListener("click", (e) => {
        const el = e.target.closest(".palette-item"); if (el) choose(Number(el.dataset.i));
    });
    list.addEventListener("pointermove", (e) => {
        const el = e.target.closest(".palette-item"); if (!el) return;
        list.querySelectorAll(".palette-item").forEach((x) => x.classList.remove("active"));
        el.classList.add("active"); active = Number(el.dataset.i);
    });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    openBtn?.addEventListener("click", open);

    document.addEventListener("keydown", (e) => {
        const tag = (e.target.tagName || "").toLowerCase();
        const typing = tag === "input" || tag === "textarea" || tag === "select";
        if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); overlay.hidden ? open() : close(); }
        else if (e.key === "/" && !typing && overlay.hidden) { e.preventDefault(); open(); }
        else if (e.key === "Escape" && !overlay.hidden) { close(); }
    });
})();
