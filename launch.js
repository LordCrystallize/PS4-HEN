var TARGET = {
  hen: "log=1&afterglow=run&payload=hen.bin",
  goldhen: "log=1&afterglow=run&mode=goldhen",
};

var AUTOSTART_SECONDS = 5;
var STORE_KEY = "afterglow.choice";

var form = document.getElementById("pick");
var autoBox = document.getElementById("auto");
var countEl = document.getElementById("count");
var cacheEl = document.getElementById("cache");
var ticker = null;
var waitingForCache = false;
var cacheTimer = null;
var gone = false;

var CACHE_WAIT_MS = 4000;

var appCache = (function () {
  try { return window.applicationCache || null; } catch (e) { return null; }
})();

function cacheBusy() {
  if (!appCache) return false;
  try {
    return appCache.status === appCache.CHECKING
        || appCache.status === appCache.DOWNLOADING;
  } catch (e) {
    return false;
  }
}

var SWAP_KEY = "afterglow.swapped";

function swapAndReload() {
  var last = 0;
  try { last = parseInt(sessionStorage.getItem(SWAP_KEY) || "0", 10) || 0; } catch (e) {}
  if (Date.now() - last < 10000) return false;
  try { sessionStorage.setItem(SWAP_KEY, String(Date.now())); } catch (e) {}
  try { appCache.swapCache(); } catch (e) {}
  location.reload();
  return true;
}

function cacheNote() {
  if (!cacheEl) return;
  if (!appCache) { cacheEl.textContent = ""; return; }
  var text = "";
  try {
    if (appCache.status === appCache.CHECKING) text = "checking for updates";
    else if (appCache.status === appCache.DOWNLOADING) text = "loading files - hold on";
    else if (appCache.status === appCache.UPDATEREADY) text = "newer version cached - reloading";
    else if (appCache.status === appCache.OBSOLETE) text = "the cache was dropped - the server answers directly";
  } catch (e) {}
  cacheEl.textContent = text;
}

function cacheChanged() {
  cacheNote();
  try {
    if (appCache && appCache.status === appCache.UPDATEREADY) {
      stopClock();
      cacheNote();
      if (swapAndReload()) return;
    }
  } catch (e) {}
  if (waitingForCache && !cacheBusy()) {
    waitingForCache = false;
    start();
  }
}

if (appCache) {
  var events = ["checking", "downloading", "progress", "cached", "noupdate",
                "updateready", "error", "obsolete"];
  for (var e = 0; e < events.length; e++) {
    try { appCache.addEventListener(events[e], cacheChanged, false); } catch (err) {}
  }
}

function remember() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ payload: picked(), autostart: autoBox.checked }),
    );
  } catch (e) {}
}

function restore() {
  var saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
  } catch (e) {}
  if (!saved) return;

  if (saved.payload && TARGET[saved.payload]) {
    var radio = form.querySelector(
      'input[name="payload"][value="' + saved.payload + '"]',
    );
    if (radio) radio.checked = true;
  }
  if (typeof saved.autostart === "boolean") autoBox.checked = saved.autostart;
}

function picked() {
  var radio = form.querySelector('input[name="payload"]:checked');
  return radio ? radio.value : "goldhen";
}

function start() {
  stopClock();
  try {
    if (appCache && appCache.status === appCache.UPDATEREADY) {
      if (swapAndReload()) return;
    }
  } catch (e) {}
  if (!offline() && cacheBusy()) {
    waitingForCache = true;
    countEl.textContent = "waiting for the cache";
    cacheNote();
    if (cacheTimer === null) {
      cacheTimer = setTimeout(function () {
        cacheTimer = null;
        if (!gone) { countEl.textContent = "cache did not answer - going anyway"; go(); }
      }, CACHE_WAIT_MS);
    }
    return;
  }
  go();
}

function go() {
  if (gone) return;
  gone = true;
  if (cacheTimer !== null) { clearTimeout(cacheTimer); cacheTimer = null; }
  location.href = "jb.html?" + TARGET[picked()];
}

function offline() {
  try { return navigator.onLine === false; } catch (e) { return false; }
}

function stopClock() {
  if (ticker !== null) {
    clearInterval(ticker);
    ticker = null;
  }
  countEl.textContent = "";
}

function startClock() {
  var left = AUTOSTART_SECONDS;
  countEl.textContent = "starting in " + left + "s";
  ticker = setInterval(function () {
    left -= 1;
    if (left <= 0) {
      start();
      return;
    }
    countEl.textContent = "starting in " + left + "s";
  }, 1000);
}

form.addEventListener("submit", function (ev) {
  ev.preventDefault();
  start();
});

form.addEventListener("change", function (ev) {
  remember();
  if (ev.target === autoBox) {
    if (autoBox.checked) startClock();
    else stopClock();
    return;
  }
  if (ev.target.name === "payload" && autoBox.checked) {
    stopClock();
    startClock();
  }
});

restore();
cacheNote();
if (autoBox.checked) startClock();