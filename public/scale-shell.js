/**
 * Scale Shell — sizing + sync for the transform-scaled iframe shell.
 *
 * Runs only in scale-shell.html, which the BaseLayout boot script
 * navigates to (location.replace) when the real viewport is narrower
 * than the 1728px design width. The page itself runs inside
 * #ne-scale-frame at design size; this script mounts the target page,
 * keeps the frame scaled to the real viewport, and keeps the shell's
 * address bar / title tracking in-iframe navigation.
 */
(function () {
  var DESIGN_WIDTH = 1728;
  // At and below this width the shell must NOT serve the page — the
  // native mobile layout does (Oscar's mobile brief, 2026-08-10; the
  // same 1024 seam as the BaseLayout boot and the holding pages).
  // Reached mid-life only by an iPad rotating to portrait or a window
  // being dragged narrow; the exit is a full navigation to the bare
  // page, mirroring how the boot entered.
  var MOBILE_MAX = 1024;

  var frame = document.getElementById('ne-scale-frame');
  if (!frame) return;

  // The boot script passes the target page as an encoded same-origin
  // path in the hash: scale-shell.html#%2Fabout-3%3Fframed%3D1
  var target = '';
  try {
    target = decodeURIComponent(window.location.hash.slice(1));
  } catch (e) {
    /* malformed escape — treated as missing below */
  }
  if (!target || target.charAt(0) !== '/' || target.charAt(1) === '/') {
    // No/invalid target (e.g. shell URL opened directly). Hand back to
    // the site root; its boot re-enters the shell with a proper hash if
    // the viewport still calls for it.
    window.location.replace('./');
    return;
  }

  // Exit to the bare page (the mobile handover): the inner document's
  // CURRENT location wins — the user may have navigated inside the
  // frame since mount — with the frame marker stripped so the bare
  // boot makes a fresh decision.
  function exitToBare() {
    var url;
    try {
      url = new URL(frame.contentWindow.location.href);
    } catch (e) {
      url = new URL(target, window.location.origin);
    }
    url.searchParams.delete('framed');
    window.location.replace(url.pathname + url.search + url.hash);
  }

  // Opened at mobile width (deep link straight to the shell file, or a
  // race with rotation): never mount — hand over before first paint.
  // clientWidth over innerWidth for the same staleness reason as the
  // mid-life check below.
  if ((document.documentElement.clientWidth || window.innerWidth) <= MOBILE_MAX) {
    exitToBare();
    return;
  }

  frame.src = target;

  // Address bar should show the real page URL, not the shell file.
  try {
    var initial = new URL(target, window.location.origin);
    initial.searchParams.delete('framed');
    var initialQs = initial.searchParams.toString();
    history.replaceState(
      null,
      '',
      initial.pathname + (initialQs ? '?' + initialQs : '') + initial.hash
    );
  } catch (e) {
    /* address bar keeps the shell URL — cosmetic only */
  }

  // SCALE = min(1, realW / 1728), recomputed on every resize — never
  // hardcoded to a device. The frame is laid out at design px
  // (realW/s × realH/s) and scaled back down, so it fills the real
  // viewport edge-to-edge; the #161616 shell ground shows only in
  // resize transients.
  //
  // Sizing is SELF-HEALING: DevTools device-toolbar toggles can deliver
  // a resize event whose innerWidth/innerHeight mix new and stale values
  // (observed in the field: stale innerHeight 1124 at a 1470×956
  // viewport → frame height 1124/0.850694 = 1321.27px, i.e. realH/s²,
  // and no later event to correct it). applySize is idempotent from
  // fresh reads, so after every trigger we re-verify the rendered frame
  // against the live viewport — after paint and on short timers — and
  // reapply until they agree.
  var lastLogged = '';
  function applySize() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var s = Math.min(1, vw / DESIGN_WIDTH);
    frame.style.width = vw / s + 'px';
    frame.style.height = vh / s + 'px';
    frame.style.transform = 'scale(' + s + ')';
    var line =
      'SHELL ACTIVE @ scale ' + s.toFixed(6) +
      ' / interior ' + Math.round(vw / s) + 'x' + Math.round(vh / s);
    if (line !== lastLogged) {
      lastLogged = line;
      console.info(line);
    }
  }

  function frameFillsViewport() {
    var r = frame.getBoundingClientRect();
    return (
      Math.abs(r.width - window.innerWidth) < 0.5 &&
      Math.abs(r.height - window.innerHeight) < 0.5
    );
  }

  var recheckTimers = [];
  function verifySize() {
    if (!frameFillsViewport()) applySize();
  }
  function size() {
    applySize();
    recheckTimers.forEach(clearTimeout);
    recheckTimers = [
      setTimeout(verifySize, 250),
      setTimeout(verifySize, 1000),
    ];
    requestAnimationFrame(verifySize); // no-op in hidden tabs; timers cover
  }

  size();
  // Mid-life crossing into mobile territory (iPad rotating portrait,
  // window dragged narrow): exit once the size SETTLES — the same
  // 300ms debounce the BaseLayout boot uses on its side of the seam,
  // so a transient mid-drag read can't bounce the document.
  //
  // The check reads documentElement.clientWidth, NOT innerWidth:
  // innerWidth is exactly the read this file already documents as
  // going stale after emulation/device-toolbar resizes (observed
  // again here: innerWidth stuck at the old width while the layout
  // viewport had settled at 390). The shell's documentElement is
  // viewport-sized (height:100%, absolute frame doesn't feed back),
  // so its clientWidth is a live layout truth on real devices and
  // emulators alike. And the check rides the SAME self-healing
  // triggers as sizing (verify loop below), so it converges even if
  // no resize event ever fires — the sizing lesson applied.
  var exitTimer;
  var exiting = false;
  function mobileWidth() {
    return document.documentElement.clientWidth || window.innerWidth;
  }
  function maybeExit() {
    if (exiting) return;
    if (mobileWidth() > MOBILE_MAX) {
      clearTimeout(exitTimer);
      exitTimer = 0;
      return;
    }
    if (exitTimer) return; // settle window already open
    exitTimer = setTimeout(function () {
      exitTimer = 0;
      if (!exiting && mobileWidth() <= MOBILE_MAX) {
        exiting = true;
        exitToBare();
      }
    }, 300);
  }
  window.addEventListener('resize', function () {
    size();
    maybeExit();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      size();
      maybeExit();
    });
  }
  // Slow safety net: if a stale read outlives the post-trigger rechecks
  // and no further viewport signal ever fires, converge anyway. One rect
  // read + two viewport reads every 2s — negligible. The mobile-exit
  // check rides the same net (see maybeExit's header).
  setInterval(function () {
    verifySize();
    maybeExit();
  }, 2000);
  if (window.ResizeObserver) {
    // documentElement is viewport-sized (height:100%, absolute frame
    // doesn't feed back into it), so this fires exactly when the real
    // viewport changes — independent of resize-event timing.
    new ResizeObserver(function () {
      verifySize();
      maybeExit();
    }).observe(document.documentElement);
  }

  // Focus the framed document immediately so keyboard scrolling and the
  // page's key guards work without a first click.
  frame.addEventListener('load', function () {
    try {
      frame.contentWindow.focus();
    } catch (e) {
      /* same-origin by construction, but stay safe */
    }
  });

  // The framed page posts its URL + title on every full-page load
  // (navigation inside the frame). Mirror them into the shell so deep
  // links, refresh, and copy-URL all land on the right page.
  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) return;
    var data = event.data;
    if (!data || data.type !== 'ne-scale-shell:navigated') return;
    if (typeof data.href !== 'string') return;

    var url;
    try {
      url = new URL(data.href);
    } catch (e) {
      return;
    }
    if (url.origin !== window.location.origin) return;

    url.searchParams.delete('framed');
    var qs = url.searchParams.toString();
    history.replaceState(null, '', url.pathname + (qs ? '?' + qs : '') + url.hash);

    if (typeof data.title === 'string' && data.title) {
      document.title = data.title;
    }
  });
})();
