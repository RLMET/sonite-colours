/* Middle Earth Tiles: tap a RocketSpark photo to see it full screen.
   Works on gallery and picture blocks only. Swatch palettes (iframes) and buttons are untouched. */
(function () {
  if (window.__metLightbox) return;
  window.__metLightbox = 1;

  var SEL = '.grid-gallery-block img, .block--picture img';

  function bigUrl(img) {
    var u = img.getAttribute('data-src') || img.currentSrc || img.src || '';
    var pic = img.closest('picture');
    if (pic) {
      var s = pic.querySelector('source');
      var set = s && (s.getAttribute('data-srcset') || s.getAttribute('srcset'));
      if (set) u = set.split(/,\s+/).pop().trim().split(' ')[0] || u;
    }
    // RocketSpark gallery images: ask the image server for the whole photo, uncropped
    var m = u.match(/^(https:\/\/pictures\.rs-cdn\.com\/[^/]+\/)([^/]+)\/([^/]+)$/);
    if (m) {
      // keep RocketSpark's own edge trim, so white borders on the original photo stay hidden
      var trim = (m[2].match(/(?:^|,)(trim=[^,]+)/) || [])[1];
      return m[1] + (trim ? trim + ',' : '') + 'fit=scale-down,width=1800/' + m[3];
    }
    // Picture blocks: switch to the largest stored size if one is listed
    var sizes = img.getAttribute('data-sizes');
    if (sizes) {
      var big = sizes.split(',').pop().trim();
      u = u.replace(/\/w\d+h\d+-/, '/' + big + '-');
    }
    return u;
  }

  function caption(img) {
    var item = img.closest('.grid-gallery__item-container');
    var t = item ? item.innerText.replace(/\s+/g, ' ').trim() : '';
    return t.length > 60 ? '' : t;
  }

  var css = document.createElement('style');
  css.textContent =
    '.met-lb{position:fixed;top:0;left:0;right:0;height:100vh;height:100lvh;z-index:2147483000;background:rgba(15,15,12,.97);display:flex;align-items:center;justify-content:center;touch-action:none;opacity:0;transition:opacity .2s}' +
    '.met-lb.on{opacity:1}' +
    '.met-lb img{width:100vw;height:100vh;height:100dvh;align-self:flex-start;object-fit:contain;display:block;user-select:none;-webkit-user-select:none;transition:transform .2s}' +
    '.met-lb button{position:absolute;background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:999px;width:44px;height:44px;font:28px/44px Arial,sans-serif;cursor:pointer;padding:0}' +
    '.met-lb .x{top:12px;right:12px}' +
    '.met-lb .p{left:10px;top:50%;margin-top:-22px}.met-lb .n{right:10px;top:50%;margin-top:-22px}' +
    '.met-lb .c{position:absolute;left:0;right:0;bottom:14px;text-align:center;color:#fff;font:15px/1.3 Arial,sans-serif;padding:0 60px}' +
    '.grid-gallery__item-container,.block--picture img{cursor:zoom-in}';
  document.head.appendChild(css);

  var box, im, cap, list = [], idx = 0, pushed = false, prevBg = '';

  function show(i) {
    idx = (i + list.length) % list.length;
    var src = list[idx];
    im.src = src.img.currentSrc || src.img.src || '';
    var full = new Image();
    full.onload = function () { if (list[idx] === src) im.src = full.src; };
    full.src = bigUrl(src.img);
    im.alt = src.img.alt || '';
    cap.textContent = caption(src.img);
    box.querySelector('.p').style.display = box.querySelector('.n').style.display = list.length > 1 ? '' : 'none';
  }

  function open(img) {
    var group = img.closest('.grid-gallery-block, .block--picture');
    list = [].slice.call(group.querySelectorAll('img')).map(function (x) { return { img: x }; });
    var start = list.findIndex(function (o) { return o.img === img; });
    box = document.createElement('div');
    box.className = 'met-lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Photo, full screen');
    box.innerHTML = '<img><button class="x" aria-label="Close">×</button><button class="p" aria-label="Previous photo">‹</button><button class="n" aria-label="Next photo">›</button><div class="c"></div>';
    im = box.querySelector('img');
    cap = box.querySelector('.c');
    document.body.appendChild(box);
    document.documentElement.style.overflow = 'hidden'; prevBg = document.documentElement.style.backgroundColor; document.documentElement.style.backgroundColor = '#0f0f0c';
    show(start < 0 ? 0 : start);
    requestAnimationFrame(function () { box.classList.add('on'); });
    box.querySelector('.p').onclick = function (e) { e.stopPropagation(); show(idx - 1); };
    box.querySelector('.n').onclick = function (e) { e.stopPropagation(); show(idx + 1); };
    box.onclick = function () { close(); };
    var sx = 0, sy = 0;
    box.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchmove', function (e) { var dy = e.touches[0].clientY - sy; if (dy > 0) im.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      im.style.transform = '';
      if (dy > 90 && Math.abs(dx) < 80) { e.preventDefault(); close(); }
      else if (Math.abs(dx) > 50 && Math.abs(dy) < 80 && list.length > 1) { e.preventDefault(); show(idx + (dx < 0 ? 1 : -1)); }
    });
    try { history.pushState({ metLb: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
  }

  function close(fromBack) {
    if (!box) return;
    var b = box; box = null;
    b.classList.remove('on');
    setTimeout(function () { b.remove(); }, 200);
    document.documentElement.style.overflow = ''; document.documentElement.style.backgroundColor = prevBg || '';
    if (pushed && !fromBack) { pushed = false; try { history.back(); } catch (e) {} }
    pushed = false;
  }

  window.addEventListener('popstate', function () { if (box) close(true); });
  document.addEventListener('keydown', function (e) {
    if (!box) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  document.addEventListener('click', function (e) {
    if (document.querySelector('.blockEditMode')) return; // not in the RocketSpark editor
    var t = e.target, img = null;
    if (!t.closest) return;
    var item = t.closest('.grid-gallery__item-container');
    if (item && item.closest('.grid-gallery-block')) {
      var link = item.querySelector('a[href]');
      if (link && link.getAttribute('href')) return; // a photo given a real link keeps it
      img = item.querySelector('img');
    } else {
      img = t.closest(SEL);
      if (img) { var a = img.closest('a'); if (a && a.getAttribute('href')) return; }
    }
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    open(img);
  }, true);
})();
