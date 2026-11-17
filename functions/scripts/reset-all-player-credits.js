'use strict';

const admin = require('firebase-admin');

const projectId = process.env.GCLOUD_PROJECT || 'tetris-862ae';
const confirmed = process.argv.includes('--confirm-reset-all-player-credits');
const expectedProject = '--project=tetris-862ae';

if (!process.argv.includes(expectedProject)) {
  throw new Error(`Pass ${expectedProject} to target the intended Firebase project.`);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId
});

async function resetPlayerCredits() {
  const db = admin.firestore();
  const pageSize = 450;
  let cursor = null;
  let scanned = 0;
  let changed = 0;

  while (true) {
    let query = db.collection('players')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;

    const batch = db.batch();
    let batchChanges = 0;
    for (const player of page.docs) {
      scanned++;
      if (player.get('credits') !== 0) {
        changed++;
        if (confirmed) {
          batch.update(player.ref, { credits: 0 });
          batchChanges++;
        }
      }
    }

    if (batchChanges) await batch.commit();
    cursor = page.docs[page.docs.length - 1];
    if (page.size < pageSize) break;
  }

  const action = confirmed ? 'Reset' : 'Would reset';
  console.log(`${action} credits for ${changed} of ${scanned} player profiles.`);
  if (!confirmed) {
    console.log('Dry run only. Add --confirm-reset-all-player-credits to apply the reset.');
  }
}

resetPlayerCredits().catch(error => {
  console.error('Could not reset player credits:', error);
  process.exitCode = 1;
});
