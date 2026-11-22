// Users live in data/users.json. A fresh checkout has none: create them with
// `node scripts/create-user.js <email> <password> [role]`.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const FILE = process.env.USERS_FILE || path.join(__dirname, "..", "data", "users.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(users) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2));
}

function hash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString("hex")}`;
}

function create(email, password, role = "customer") {
  const users = load().filter((u) => u.email !== email.toLowerCase());
  users.push({ email: email.toLowerCase(), password: hash(password), role });
  save(users);
}

function check(email, password) {
  const u = load().find((x) => x.email === String(email || "").toLowerCase());
  if (!u) return null;
  const [salt] = u.password.split(":");
  const a = Buffer.from(hash(String(password || ""), salt));
  const b = Buffer.from(u.password);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? u : null;
}

module.exports = { create, check, load };
