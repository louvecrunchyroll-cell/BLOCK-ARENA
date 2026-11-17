(() => {
  'use strict';

  const REWARDS_XP = [250, 450, 1_500, 3_500, 5_500, 8_000, 10_000, 12_500, 15_000, 20_000];
  const QUESTS = [
    {
      id: 'gamesPlayed', title: 'JOUER DES PARTIES', stat: 'gamesPlayed',
      thresholds: [1, 5, 10, 20, 30, 40, 50, 65, 80, 100],
      objective: value => `Jouer ${value} ${value === 1 ? 'partie' : 'parties'}`,
      progressUnit: value => value === 1 ? 'partie' : 'parties'
    },
    {
      id: 'linesCleared', title: 'RÉALISER DES LIGNES', stat: 'linesCleared',
      thresholds: [1, 10, 25, 50, 100, 200, 350, 500, 750, 1_000],
      objective: value => `Réaliser ${format(value)} ${value === 1 ? 'ligne' : 'lignes'}`,
      progressUnit: value => value === 1 ? 'ligne' : 'lignes'
    },
    {
      id: 'piecesPlaced', title: 'PLACER DES FORMES', stat: 'piecesPlaced',
      thresholds: [10, 50, 100, 250, 500, 1_000, 2_000, 3_500, 5_000, 10_000],
      objective: value => `Placer ${format(value)} formes`,
      progressUnit: () => 'formes'
    },
    {
      id: 'friendsAdded', title: 'AJOUTER DES AMIS', stat: 'friendsAdded',
      thresholds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      objective: value => `Ajouter ${value} ${value === 1 ? 'ami' : 'amis'}`,
      progressUnit: value => value === 1 ? 'ami' : 'amis'
    },
    {
      id: 'xpBoostsActivated', title: 'ACTIVER DES BOOST XP', stat: 'xpBoostsActivated',
      thresholds: [1, 2, 3, 5, 7, 10, 13, 16, 20, 25],
      objective: value => `Activer ${value} Boost XP`,
      progressUnit: () => 'Boost XP'
    },
    {
      id: 'giftsSent', title: 'OFFRIR DES CADEAUX', stat: 'giftsSent',
      thresholds: [1, 2, 3, 5, 7, 10, 15, 20, 30, 50],
      objective: value => `Offrir ${value} ${value === 1 ? 'cadeau' : 'cadeaux'}`,
      progressUnit: value => value === 1 ? 'cadeau' : 'cadeaux',
      unavailable: true
    },
    {
      id: 'bestSingleGameLines', title: 'RECORD DE LIGNES EN UNE SEULE PARTIE',
      stat: 'bestSingleGameLines',
      thresholds: [1, 3, 5, 8, 12, 16, 20, 30, 40, 50],
      objective: value => `Réaliser ${value} ${value === 1 ? 'ligne' : 'lignes'} dans une partie`,
      progressUnit: value =>
        `${value === 1 ? 'ligne' : 'lignes'} dans une partie`
    }
  ];

  const categories = document.getElementById('questCategories');
  const status = document.getElementById('questStatus');
  let unsubscribe = null;
  let firestore = null;

  function format(value) {
    return value.toLocaleString('fr-FR');
  }

  function validateProgress(data) {
    if (!data || data.schemaVersion !== 1 || !data.statistics ||
        typeof data.statistics !== 'object' || !data.completedSteps ||
        typeof data.completedSteps !== 'object' ||
        !data.rewardedSteps || typeof data.rewardedSteps !== 'object') {
      throw new Error('Les données de progression des quêtes sont invalides.');
    }
    for (const quest of QUESTS) {
      const count = data.statistics[quest.stat];
      const completed = data.completedSteps[quest.id];
      const rewarded = data.rewardedSteps[quest.id];
      if (!Number.isSafeInteger(count) || count < 0 ||
          !Array.isArray(completed) || !Array.isArray(rewarded) ||
          completed.length !== rewarded.length ||
          quest.thresholds.some((threshold, index) =>
            (count >= threshold) !== completed.includes(index + 1)) ||
          completed.some((step, index) => step !== rewarded[index] ||
            !Number.isSafeInteger(step) || step < 1 || step > 10 ||
            count < quest.thresholds[step - 1])) {
        throw new Error('Les données de progression des quêtes sont invalides.');
      }
    }
    return data;
  }

  function createStepCard(quest, index, current, completedSteps) {
    const stepNumber = index + 1;
    const target = quest.thresholds[index];
    const completed = completedSteps.includes(stepNumber);
    const shownProgress = completed ? target : current;
    const percentage = Math.min(100, shownProgress / target * 100);
    const card = document.createElement('article');
    card.className = `step${stepNumber >= 8 ? ' prestige' : ''}${completed ? ' completed' : ''}`;

    const heading = document.createElement('div');
    heading.className = 'step-head';
    const number = document.createElement('span');
    number.className = 'step-number';
    number.textContent = `${stepNumber}/10`;
    const title = document.createElement('h3');
    title.textContent = quest.objective(target);
    heading.append(number, title);

    const progressCopy = document.createElement('p');
    progressCopy.className = 'progress-copy';
    progressCopy.textContent =
      `Progression : ${format(shownProgress)} / ${format(target)} ${quest.progressUnit(target)}`;

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', `Progression ${stepNumber}/10`);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(target));
    bar.setAttribute('aria-valuenow', String(shownProgress));
    const fill = document.createElement('span');
    fill.style.width = `${percentage}%`;
    bar.append(fill);

    const rewardRow = document.createElement('div');
    rewardRow.className = 'reward-row';
    const reward = document.createElement('span');
    reward.className = 'reward';
    reward.textContent = `Récompense : +${format(REWARDS_XP[index])} XP`;
    const label = document.createElement('span');
    label.className = completed ? 'completed-label' : 'not-completed';
    label.textContent = completed ? 'TERMINÉE' : 'EN COURS';
    rewardRow.append(reward, label);
    card.append(heading, progressCopy, bar, rewardRow);
    return card;
  }

  function render(data) {
    const validData = validateProgress(data);
    categories.replaceChildren();
    for (const quest of QUESTS) {
      const section = document.createElement('section');
      section.className = 'category';
      const heading = document.createElement('h2');
      heading.textContent = `QUÊTE — ${quest.title}`;
      section.append(heading);
      if (quest.unavailable) {
        const note = document.createElement('p');
        note.className = 'unavailable';
        note.textContent =
          'L’envoi de cadeaux n’est pas encore disponible dans la Boutique. Cette progression reste à 0 et aucune récompense n’est simulée.';
        section.append(note);
      }
      const steps = document.createElement('div');
      steps.className = 'steps';
      const current = validData.statistics[quest.stat];
      const activeIndex = quest.thresholds.findIndex(target => current < target);
      const visibleIndex = activeIndex === -1 ? quest.thresholds.length - 1 : activeIndex;
      steps.append(createStepCard(
        quest,
        visibleIndex,
        current,
        activeIndex === -1 ? [visibleIndex + 1] : []
      ));
      section.append(steps);
      categories.append(section);
    }
  }

  function showSignIn() {
    status.classList.remove('error');
    status.textContent = '';
    const link = document.createElement('a');
    link.href = 'tetris_connexion.html';
    link.textContent = 'Connecte-toi pour consulter et sauvegarder tes quêtes.';
    status.append(link);
  }

  function emptyProgressData() {
    return {
      schemaVersion: 1,
      statistics: Object.fromEntries(QUESTS.map(quest => [quest.stat, 0])),
      completedSteps: Object.fromEntries(QUESTS.map(quest => [quest.id, []])),
      rewardedSteps: Object.fromEntries(QUESTS.map(quest => [quest.id, []]))
    };
  }

  function attachUser(user) {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    categories.replaceChildren();
    if (!user) {
      render(emptyProgressData());
      showSignIn();
      return;
    }
    status.classList.remove('error');
    status.textContent = 'Chargement de ta progression sauvegardée…';
    unsubscribe = firestore
      .doc(`players/${user.uid}/quests/progress`)
      .onSnapshot(snapshot => {
        try {
          if (snapshot.exists) {
            render(snapshot.data());
            status.textContent = 'Progression synchronisée avec Firestore.';
          } else {
            render(emptyProgressData());
            status.textContent =
              'Aucune progression enregistrée pour le moment. Les quêtes avancent uniquement après une action suivie.';
          }
        } catch (error) {
          console.error('Lecture de la progression des quêtes invalide.', { uid: user.uid, error });
          categories.replaceChildren();
          status.classList.add('error');
          status.textContent = `Impossible d’afficher les quêtes : ${error.message}`;
        }
      }, error => {
        console.error('Lecture de la progression des quêtes impossible.', { uid: user.uid, error });
        categories.replaceChildren();
        status.classList.add('error');
        status.textContent = `Impossible de charger les quêtes : ${error.message}`;
      });
  }

  document.querySelector('.back').addEventListener('click', () => {
    const destination = 'tetris_salon_mobile_battle_pass.html';
    if (window.TetrisPageTransition) window.TetrisPageTransition.navigate(destination);
    else window.location.href = destination;
  });

  Promise.resolve(window.BLOCK_ARENA_FIREBASE_READY)
    .then(async ready => {
      if (!ready || !window.firebase) {
        throw new Error('Firebase n’est pas configuré pour ce site.');
      }
      const app = firebase.apps.length
        ? firebase.app() : firebase.initializeApp(window.BLOCK_ARENA_FIREBASE_CONFIG);
      const auth = firebase.auth(app);
      firestore = firebase.firestore(app);
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      auth.onAuthStateChanged(attachUser, error => {
        console.error('État de connexion des quêtes indisponible.', error);
        status.classList.add('error');
        status.textContent = `Connexion indisponible : ${error.message}`;
      });
    })
    .catch(error => {
      console.error('Initialisation Firebase des quêtes impossible.', error);
      status.classList.add('error');
      status.textContent = `Impossible de charger les quêtes : ${error.message}`;
    });
})();
