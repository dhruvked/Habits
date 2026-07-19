require("dotenv").config({ path: ".env.local" });
const { sql } = require("@vercel/postgres");

async function run() {
  try {
    await sql`UPDATE habits SET name = UPPER(name)`;
    console.log("Updated all habits to uppercase");
  } catch (err) {
    console.error(err);
  }
}
run();
