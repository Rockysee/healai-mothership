import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = join(__dirname, "..", "storage");

if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true });
}

export let db;

export async function initDB() {
  try {
    console.log("   Connecting to local SQLite database...");
    
    db = await open({
      filename: join(STORAGE_DIR, "framegen.sqlite"),
      driver: sqlite3.Database
    });

    // Enforce relational foreign keys in SQLite
    await db.run("PRAGMA foreign_keys = ON;");

    // create users
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // create projects
    await db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        style TEXT,
        mood TEXT,
        duration TEXT,
        scene_count INTEGER DEFAULT 0,
        status TEXT,
        blueprint TEXT,
        scenes TEXT,
        final_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // create continuity projects (multi-chapter feature films)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS continuity_projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        genre TEXT,
        total_duration TEXT,
        chapters TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("   SQLite initialized successfully.");
  } catch (err) {
    console.error("   SQLite initialization failed:", err.message);
  }
}
