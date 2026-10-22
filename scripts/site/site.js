// Small helpers for the docs site: theme, menu, copy buttons, "on this page", image viewer.
(function () {
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Light / dark toggle, remembered in this browser
  var themeBtn = $(".theme-btn");
  function isDark() {
    var t = root.dataset.theme;
    return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  }
  // Screenshots come in a light and a dark version (<picture> with a dark <source>): follow the chosen theme, not only the system's
  function pictures() {
    var dark = isDark();
    $$('picture source[media*="prefers-color-scheme: dark"]').forEach(function (s) {
      if (!s.dataset.media) s.dataset.media = s.media;
      s.media = dark ? "all" : "not all";
    });
  }
  pictures();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", pictures);
  themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("mm-theme", next); } catch (e) {}
    pictures();
  });

  // Menu on phones
  var menuBtn = $(".menu-btn"), scrim = $(".scrim"), sidebar = $(".sidebar");
  function menu(open) {
    sidebar.classList.toggle("open", open);
    scrim.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
  }
  menuBtn.addEventListener("click", function () { menu(!sidebar.classList.contains("open")); });
  scrim.addEventListener("click", function () { menu(false); });

  // Copy buttons on code blocks
  $$(".doc pre").forEach(function (pre) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "copy-btn"; b.textContent = "Copy";
    b.addEventListener("click", function () {
      var text = pre.innerText.replace(/\s*Copy\s*$/, "");
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
    });
    pre.appendChild(b);
  });

  // Highlight the heading you are reading in "On this page"
  var links = $$(".toc a");
  var heads = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  function spy() {
    var cur = -1;
    heads.forEach(function (h, i) { if (h && h.getBoundingClientRect().top < 110) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle("active", i === cur); if (i === cur) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current"); });
  }
  if (links.length) { addEventListener("scroll", spy, { passive: true }); spy(); } else { var t = $(".toc"); if (t) t.classList.add("empty"); }

  // Click an image to see it full size
  var lb = $(".lightbox"), lbImg = $("img", lb), lastFocus;
  function closeLb() { lb.hidden = true; if (lastFocus) lastFocus.focus(); }
  $$(".doc img").forEach(function (img) {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    var open = function () {
      lastFocus = img;
      lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt;
      lb.hidden = false; $(".lb-close", lb).focus();
    };
    img.addEventListener("click", open);
    img.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  lb.addEventListener("click", closeLb);
  addEventListener("keydown", function (e) { if (e.key === "Escape") { if (!lb.hidden) closeLb(); else menu(false); } });

  // Wrap tables so they scroll sideways on phones
  $$(".doc table").forEach(function (t) {
    var w = document.createElement("div"); w.className = "table-wrap"; w.tabIndex = 0;
    t.parentNode.insertBefore(w, t); w.appendChild(t);
  });

  // Close the phone menu after choosing a page
  $$(".sidebar a").forEach(function (a) { a.addEventListener("click", function () { menu(false); }); });
})();
