const serverless = require('serverless-http');
const app = require('../../app');
const { ensureAdmin } = require('../../db/seed');

app.attachErrorHandler();

const serverlessHandler = serverless(app);

// Ensures the schema exists and the first admin account is created.
// This runs on cold start of the function container; subsequent invocations
// on a warm container skip straight through since ensureAdmin() is a no-op
// once the admin account exists.
let seeded = null;
async function ensureSeeded() {
  if (!seeded) {
    seeded = ensureAdmin().then(result => {
      if (result.created) {
        console.log('No admin account found — created one automatically:');
        console.log(`  email:    ${result.email}`);
        console.log(`  password: ${result.password}`);
        console.log('Log in and change this password as soon as possible.');
      }
    });
  }
  return seeded;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await ensureSeeded();
  return serverlessHandler(event, context);
};
