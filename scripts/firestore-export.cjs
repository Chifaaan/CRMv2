/** One-off Firestore export script (was mistakenly placed under .env.local). */
const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function exportCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const data = [];

  snapshot.forEach((doc) => {
    data.push({ id: doc.id, ...doc.data() });
  });

  return data;
}

async function exportAll() {
  const collections = [
    "users",
    "projects",
    "tasks",
    "clients",
    "meetings",
    "notes",
    "sprints",
    "maintenance",
    "discussions",
    "notifications",
    "activity_log",
    "note_audit",
  ];

  const result = {};

  for (const col of collections) {
    console.log(`Exporting: ${col}...`);
    result[col] = await exportCollection(col);
    console.log(`  ✓ ${result[col].length} documents`);
  }

  fs.writeFileSync(
    "trackly_export.json",
    JSON.stringify(result, null, 2),
    "utf-8",
  );

  for (const col of collections) {
    fs.writeFileSync(
      `export_${col}.json`,
      JSON.stringify(result[col], null, 2),
      "utf-8",
    );
  }

  console.log("\n✅ Export selesai. File: trackly_export.json");
}

exportAll().catch(console.error);
