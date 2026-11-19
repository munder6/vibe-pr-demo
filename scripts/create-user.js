// Create or replace a user: node scripts/create-user.js <email> <password> [role]
const users = require("../lib/users");
const [email, password, role] = process.argv.slice(2);
if (!email || !password) {
  console.error("usage: node scripts/create-user.js <email> <password> [role]");
  process.exit(1);
}
users.create(email, password, role || "customer");
console.log(`user ${email} saved`);
