const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function test() {
  const db = await open({
    filename: "/Users/hemantithackeray/Desktop/Hemant's Stack/Framegen/framegen/storage/framegen.sqlite",
    driver: sqlite3.Database
  });
  const row = await db.get("SELECT COUNT(*) as count FROM projects");
  console.log("Projects count:", row.count);
  await db.close();
}
test().catch(console.error);
