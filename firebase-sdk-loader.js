(() => {
  const config = window.BLOCK_ARENA_FIREBASE_CONFIG;
  const ready = config && config.apiKey && !config.apiKey.startsWith('YOUR_') &&
    config.authDomain && !config.authDomain.startsWith('YOUR_') &&
    config.projectId && !config.projectId.startsWith('YOUR_') &&
    config.appId && !config.appId.startsWith('YOUR_');

  if (!ready) {
    window.BLOCK_ARENA_FIREBASE_READY = Promise.resolve(false);
    return;
  }

  const sdkFiles = [
    'firebase-app-compat.js',
    'firebase-auth-compat.js',
    'firebase-firestore-compat.js'
  ];
  window.BLOCK_ARENA_FIREBASE_READY = sdkFiles.reduce(
    (promise, file) => promise.then(() => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.gstatic.com/firebasejs/10.14.1/${file}`;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Impossible de charger le SDK Firebase (${file}).`));
      document.head.append(script);
    })),
    Promise.resolve()
  );
})();
