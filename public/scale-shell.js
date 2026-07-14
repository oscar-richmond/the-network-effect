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
  window.addEventListener('resize', size);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', size);
  }
  // Slow safety net: if a stale read outlives the post-trigger rechecks
  // and no further viewport signal ever fires, converge anyway. One rect
  // read + two viewport reads every 2s — negligible.
  setInterval(verifySize, 2000);
  if (window.ResizeObserver) {
    // documentElement is viewport-sized (height:100%, absolute frame
    // doesn't feed back into it), so this fires exactly when the real
    // viewport changes — independent of resize-event timing.
    new ResizeObserver(verifySize).observe(document.documentElement);
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
