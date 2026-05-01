import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".aria-data", "chats");

function ensureUserDir(userId: string) {
  const dir = join(DATA_DIR, userId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export interface StoredChat {
  id:       string;
  userId:   string;
  title:    string;
  messages: unknown[];
  savedAt:  string;
  msgCount: number;
}

export function saveChat(userId: string, chat: StoredChat): void {
  try {
    const dir      = ensureUserDir(userId);
    const filePath = join(dir, `${chat.id}.json`);
    writeFileSync(filePath, JSON.stringify(chat, null, 2), "utf-8");
  } catch (err) { console.error("[ChatStorage] Save error:", err); }
}

export function loadUserChats(userId: string): StoredChat[] {
  try {
    const dir = join(DATA_DIR, userId);
    if (!existsSync(dir)) return [];
    const fs  = require("fs");
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".json"));
    const chats: StoredChat[] = [];
    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        chats.push(JSON.parse(raw));
      } catch { /* skip corrupted file */ }
    }
    return chats.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 30);
  } catch { return []; }
}

export function deleteChat(userId: string, chatId: string): void {
  try {
    const filePath = join(DATA_DIR, userId, `${chatId}.json`);
    if (existsSync(filePath)) {
      const fs = require("fs");
      fs.unlinkSync(filePath);
    }
  } catch (err) { console.error("[ChatStorage] Delete error:", err); }
}

export function getChatCount(userId: string): number {
  try {
    const dir = join(DATA_DIR, userId);
    if (!existsSync(dir)) return 0;
    const fs = require("fs");
    return fs.readdirSync(dir).filter((f: string) => f.endsWith(".json")).length;
  } catch { return 0; }
}
