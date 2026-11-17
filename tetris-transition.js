(() => {
  'use strict';

  const loadingScreenKey = 'tetrisEquippedLoadingScreen';
  const loadingDuration = 3500;
  const destinations = {
    salon: 'tetris_salon_mobile_battle_pass.html',
    jouer: 'tetris_jouer_mobile.html',
    battlepass: 'tetris_battle_pass_mobile.html',
    boutique: 'tetris_boutique_mobile.html',
    amis: 'tetris_amis_mobile.html',
    casier: 'tetris_casier_mobile.html.html',
    classement: 'tetris_classement_mobile.html',
    parametres: 'tetris_parametres_mobile.html',
    aideinfos: 'tetris_aide_infos_mobile.html'
  };
  let overlay = null;
  let loadingTimer = null;
  let progressTimer = null;
  let resolveLoading = null;
  let loadingPromise = Promise.resolve();
  let navigating = false;
  let loadingScreenUrl = '';
  let storedUrl = '';
  try {
    storedUrl = localStorage.getItem(loadingScreenKey) || '';
  } catch (error) {
    console.warn('Impossible de lire l’écran de chargement mémorisé sur cet appareil.', error);
  }
  if (!storedUrl) {
    try {
      storedUrl = sessionStorage.getItem(loadingScreenKey) || '';
    } catch (error) {
      console.warn('Impossible de lire l’écran de chargement mémorisé dans cette session.', error);
    }
  }
  try {
    if (storedUrl) {
      const parsedUrl = new URL(storedUrl, location.href);
      if (parsedUrl.origin === location.origin && parsedUrl.pathname.startsWith('/')) {
        loadingScreenUrl = parsedUrl.pathname;
      }
    }
  } catch (error) {
    console.warn('Impossible de lire l’écran de chargement équipé.', error);
  }

  const style = document.createElement('style');
  style.textContent = `
    #tetris-page-transition{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,#20275b 0%,#111632 52%,#090d20 100%);opacity:1;transition:opacity .22s ease;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
    #tetris-page-transition.is-hiding{opacity:0;pointer-events:none}
    #tetris-page-transition .transition-content{position:relative;z-index:2;display:flex;width:min(420px,calc(100% - 40px));flex-direction:column;align-items:center;gap:22px;padding:24px;text-align:center}
    #tetris-page-transition .transition-logo{font-size:clamp(30px,8vw,64px);font-weight:1000;letter-spacing:-.08em;line-height:1;text-shadow:0 0 12px #a743ff,0 0 32px #286dff;white-space:nowrap}
    #tetris-page-transition .transition-logo span:nth-child(1){color:#ff39b4}#tetris-page-transition .transition-logo span:nth-child(2){color:#ff8b20}#tetris-page-transition .transition-logo span:nth-child(3){color:#ffcb25}#tetris-page-transition .transition-logo span:nth-child(4){color:#28e66e}#tetris-page-transition .transition-logo span:nth-child(5){color:#23c6ff}#tetris-page-transition .transition-logo span:nth-child(6){color:#a353ff}
    #tetris-page-transition .transition-loading{font-size:13px;font-weight:800;letter-spacing:.28em;color:#c7d7ff;text-shadow:0 0 12px #4ccaff}
    #tetris-page-transition .transition-progress{width:100%;height:12px;padding:2px;overflow:hidden;border:1px solid #73dfff;border-radius:20px;background:#090d20cc;box-shadow:0 0 16px #36cfff66}
    #tetris-page-transition .transition-progress-fill{width:0;height:100%;border-radius:20px;background:linear-gradient(90deg,#7f58ff,#35dfff,#f849e8);box-shadow:0 0 12px #4ccaff;transform-origin:left;transition:width linear}
    #tetris-page-transition .transition-blocks{position:absolute;inset:0;overflow:hidden;pointer-events:none}
    #tetris-page-transition .transition-custom-screen{position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;opacity:.82;pointer-events:none}
    #tetris-page-transition .transition-block{position:absolute;width:clamp(12px,3vw,20px);aspect-ratio:1;border-radius:4px;background:var(--block-color);box-shadow:0 0 9px var(--block-color),0 0 24px var(--block-color);animation:tetris-transition-fall var(--fall-duration) linear var(--fall-delay) infinite;left:var(--block-left);top:-8vh}
    @keyframes tetris-transition-fall{0%{transform:translate3d(0,-8vh,0) rotate(0deg);opacity:0}10%{opacity:.9}85%{opacity:.8}100%{transform:translate3d(var(--block-drift),115vh,0) rotate(240deg);opacity:0}}
    @media(prefers-reduced-motion:reduce){#tetris-page-transition .transition-block{animation-duration:3.5s}#tetris-page-transition,#tetris-page-transition.is-hiding{transition:none}}
  `;
  document.head.append(style);

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'tetris-page-transition';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    const customScreen = document.createElement('img');
    customScreen.className = 'transition-custom-screen';
    customScreen.alt = '';
    customScreen.hidden = true;
    const blocks = document.createElement('div');
    blocks.className = 'transition-blocks';
    const colors = ['#41e8ff', '#ed5dff', '#5479ff', '#b85cff', '#41e8ff', '#ed5dff', '#5479ff', '#b85cff', '#41e8ff', '#ed5dff', '#5479ff', '#b85cff'];
    colors.forEach((color, index) => {
      const block = document.createElement('i');
      block.className = 'transition-block';
      block.style.setProperty('--block-color', color);
      block.style.setProperty('--block-left', `${6 + index * 8}%`);
      block.style.setProperty('--fall-delay', `${-(index % 6) * 0.31}s`);
      block.style.setProperty('--fall-duration', `${2.1 + (index % 4) * 0.35}s`);
      block.style.setProperty('--block-drift', `${index % 2 ? 48 : -48}px`);
      blocks.append(block);
    });
    const content = document.createElement('div');
    content.className = 'transition-content';
    const logo = document.createElement('div');
    logo.className = 'transition-logo';
    logo.setAttribute('aria-label', 'BLOCK ARENA');
    for (const word of ['BLOCK', 'ARENA']) {
      const span = document.createElement('span');
      span.textContent = word;
      logo.append(span);
    }
    const loading = document.createElement('div');
    loading.className = 'transition-loading';
    loading.textContent = 'CHARGEMENT...';
    const progress = document.createElement('div');
    progress.className = 'transition-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', 'Chargement');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', '100');
    const progressFill = document.createElement('div');
    progressFill.className = 'transition-progress-fill';
    progress.append(progressFill);
    content.append(logo, loading, progress);
    overlay.append(customScreen, blocks, content);
    updateLoadingScreenImage();
    document.documentElement.append(overlay);
    return overlay;
  }

  function updateLoadingScreenImage() {
    if (!overlay) return;
    const image = overlay.querySelector('.transition-custom-screen');
    if (!image) return;
    image.hidden = !loadingScreenUrl;
    if (loadingScreenUrl) image.src = loadingScreenUrl;
    else image.removeAttribute('src');
  }

  function setLoadingScreen(url) {
    let nextUrl = '';
    if (typeof url === 'string' && url) {
      try {
        const parsedUrl = new URL(url, location.href);
        if (parsedUrl.origin === location.origin && parsedUrl.pathname.startsWith('/')) {
          nextUrl = parsedUrl.pathname;
        }
      } catch (error) {
        console.error('URL d’écran de chargement invalide.', error);
      }
    }
    loadingScreenUrl = nextUrl;
    if (nextUrl) {
      try {
        localStorage.setItem(loadingScreenKey, nextUrl);
      } catch (error) {
        console.warn('Impossible de mémoriser durablement l’écran de chargement équipé.', error);
      }
      try {
        sessionStorage.setItem(loadingScreenKey, nextUrl);
      } catch (error) {
        console.warn('Impossible de mémoriser l’écran de chargement pour cette session.', error);
      }
    } else {
      try {
        localStorage.removeItem(loadingScreenKey);
      } catch (error) {
        console.warn('Impossible d’effacer l’écran de chargement mémorisé sur cet appareil.', error);
      }
      try {
        sessionStorage.removeItem(loadingScreenKey);
      } catch (error) {
        console.warn('Impossible d’effacer l’écran de chargement mémorisé dans cette session.', error);
      }
    }
    updateLoadingScreenImage();
  }

  function show() {
    if (overlay && !overlay.classList.contains('is-hiding')) return loadingPromise;
    const panel = createOverlay();
    loadingPromise = new Promise(resolve => { resolveLoading = resolve; });
    updateLoadingScreenImage();
    panel.classList.remove('is-hiding');
    const progress = panel.querySelector('.transition-progress');
    const progressFill = panel.querySelector('.transition-progress-fill');
    progress.setAttribute('aria-valuenow', '0');
    progressFill.style.transitionDuration = '0ms';
    progressFill.style.width = '0%';
    const startedAt = Date.now();
    const updateProgress = () => {
      progress.setAttribute(
        'aria-valuenow',
        String(Math.min(100, Math.floor((Date.now() - startedAt) / loadingDuration * 100)))
      );
    };
    requestAnimationFrame(() => {
      progressFill.style.transitionDuration = `${loadingDuration}ms`;
      progressFill.style.width = '100%';
    });
    clearInterval(progressTimer);
    progressTimer = setInterval(updateProgress, 100);
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(hide, loadingDuration);
    return loadingPromise;
  }

  function hide() {
    if (!overlay) return;
    clearTimeout(loadingTimer);
    loadingTimer = null;
    clearInterval(progressTimer);
    progressTimer = null;
    const hidingOverlay = overlay;
    const finishLoading = resolveLoading;
    resolveLoading = null;
    hidingOverlay.classList.add('is-hiding');
    setTimeout(() => {
      if (overlay === hidingOverlay && hidingOverlay.classList.contains('is-hiding')) {
        hidingOverlay.remove();
        overlay = null;
      }
      finishLoading?.();
    }, 240);
  }

  function navigate(url) {
    if (navigating) return;
    const target = new URL(url, location.href);
    if (target.href === location.href) return;
    navigating = true;
    show();
    requestAnimationFrame(() => location.assign(target.href));
    setTimeout(() => {
      navigating = false;
    }, 5000);
  }

  function pageFromButton(button) {
    const page = (button.dataset.page || '').toLocaleLowerCase('fr')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
    const keys = {
      'aide/infos': 'aideinfos',
      aideinfos: 'aideinfos'
    };
    return destinations[keys[page] || page];
  }

  function handleNavigationClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const button = event.target.closest('button[data-page], .back, #back, #backTop, #backBottom, #quit');
    if (button) {
      if (document.getElementById('board') &&
          button.matches('.back, #back, #backTop, #backBottom, #quit')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const quitGame = window.TetrisGame?.quit;
        if (typeof quitGame === 'function') quitGame();
        else console.error('Retour annulé : le jeu n’est pas prêt à sauvegarder cette partie.');
        return;
      }
      const destination = button.matches('[data-page]') ? pageFromButton(button) : destinations.salon;
      if (!destination) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(destination);
      return;
    }
    const link = event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || !/\.html$/i.test(target.pathname)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate(target.href);
  }

  document.addEventListener('click', handleNavigationClick, true);

  window.TetrisPageTransition = {
    navigate,
    setLoadingScreen,
    waitForLoading: () => overlay ? loadingPromise : Promise.resolve(),
    startForGame: () => show()
  };

  show();
  window.addEventListener('pageshow', event => {
    if (event.persisted) waitForLoading();
  });
})();
