import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directories
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Database paths
const usersPath = path.join(dataDir, 'users.json');
const codesPath = path.join(dataDir, 'codes.json');
const sessionsPath = path.join(dataDir, 'sessions.json');

// Initialize if not exists
if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '{}');
if (!fs.existsSync(codesPath)) fs.writeFileSync(codesPath, '[]');
if (!fs.existsSync(sessionsPath)) fs.writeFileSync(sessionsPath, '{}');

class Database {
  // === USER MANAGEMENT ===
  static getUsers() {
    try {
      return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    } catch {
      return {};
    }
  }

  static saveUsers(users) {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  }

  static addUser(jid, data = {}) {
    const users = this.getUsers();
    users[jid] = {
      jid,
      number: jid.split('@')[0],
      verified: true,
      verifiedAt: new Date().toISOString(),
      attempts: 0,
      status: 'active',
      ...data
    };
    this.saveUsers(users);
    return users[jid];
  }

  static getUser(jid) {
    return this.getUsers()[jid];
  }

  static isVerified(jid) {
    const user = this.getUser(jid);
    return user && user.verified === true;
  }

  static isBlocked(jid) {
    const user = this.getUser(jid);
    return user && user.status === 'blocked';
  }

  static incrementAttempts(jid) {
    const users = this.getUsers();
    if (users[jid]) {
      users[jid].attempts = (users[jid].attempts || 0) + 1;
      if (users[jid].attempts >= 3) {
        users[jid].status = 'blocked';
        users[jid].blockedAt = new Date().toISOString();
      }
      this.saveUsers(users);
      return users[jid].attempts;
    }
    return 0;
  }

  static deleteUser(jid) {
    const users = this.getUsers();
    if (users[jid]) {
      delete users[jid];
      this.saveUsers(users);
      return true;
    }
    return false;
  }

  static getAllUsers() {
    const users = this.getUsers();
    return Object.values(users).filter(u => u.verified);
  }

  // === CODE MANAGEMENT ===
  static getCodes() {
    try {
      return JSON.parse(fs.readFileSync(codesPath, 'utf8'));
    } catch {
      return [];
    }
  }

  static saveCodes(codes) {
    fs.writeFileSync(codesPath, JSON.stringify(codes, null, 2));
  }

  static generateCode() {
    const code = 'DRGN' + 
      Math.floor(1000 + Math.random() * 9000) + 
      '25';
    
    const codes = this.getCodes();
    codes.push({
      code,
      createdAt: new Date().toISOString(),
      used: false,
      usedBy: null,
      usedAt: null
    });
    
    this.saveCodes(codes);
    return code;
  }

  static verifyCode(code) {
    const codes = this.getCodes();
    const codeIndex = codes.findIndex(c => c.code === code && !c.used);
    
    if (codeIndex !== -1) {
      return codes[codeIndex];
    }
    return null;
  }

  static useCode(code, jid) {
    const codes = this.getCodes();
    const codeIndex = codes.findIndex(c => c.code === code && !c.used);
    
    if (codeIndex !== -1) {
      codes[codeIndex].used = true;
      codes[codeIndex].usedBy = jid;
      codes[codeIndex].usedAt = new Date().toISOString();
      this.saveCodes(codes);
      return true;
    }
    return false;
  }

  static getActiveCodes() {
    return this.getCodes().filter(c => !c.used);
  }

  // === SESSION MANAGEMENT ===
  static getSessions() {
    try {
      return JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
    } catch {
      return {};
    }
  }

  static saveSessions(sessions) {
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
  }

  static getUserSession(jid) {
    return this.getSessions()[jid] || {};
  }

  static setUserSession(jid, data) {
    const sessions = this.getSessions();
    sessions[jid] = { ...sessions[jid], ...data, lastActive: new Date().toISOString() };
    this.saveSessions(sessions);
  }

  static clearUserSession(jid) {
    const sessions = this.getSessions();
    if (sessions[jid]) {
      delete sessions[jid];
      this.saveSessions(sessions);
      return true;
    }
    return false;
  }
}

export default Database;