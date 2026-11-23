#!/usr/bin/env node
/**
 * JMFoodies SQL test runner.
 *
 * Runs every *.sql file in database/tests/ against a Postgres database, each one
 * inside a transaction that is ROLLED BACK. Tests never persist data.
 *
 * A test "passes" if its whole file executes without raising. It "fails" if the
 * file raises an exception. Write tests that raise, e.g.:
 *
 *   do $$ begin
 *     if (select estimated_total from bookings where id = v_id) <> 1500 then
 *       raise exception 'price authority broken: expected 1500';
 *     end if;
 *   end $$;
 *
 * Per-file directives (first 20 lines) let a test choose its identity so RLS
 * is actually exercised:
 *
 *   -- @role authenticated
 *   -- @sub 00000000-0000-0000-0000-000000000000
 *
 * Usage:
 *   npm run test:db                 # run every test
 *   npm run test:db -- --check      # connectivity only
 *   npm run test:db -- --file database/tests/price.sql
 *
 * Requires SUPABASE_DB_URL (staging/dev only). Never production.
 */
import { readdir, readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(root, 'database', 'tests');

/** Minimal .env loader: does not override real env vars. */
async function loadEnv() {
  const envPath = path.join(root, '.env');
  try {
    await access(envPath);
  } catch {
    return;
  }
  const text = await readFile(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const out = { check: false, file: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') out.check = true;
    else if (argv[i] === '--file') out.file = argv[++i];
  }
  return out;
}

function directives(sql) {
  const head = sql.split(/\r?\n/).slice(0, 20).join('\n');
  const role = head.match(/^--\s*@role\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/m);
  const sub = head.match(/^--\s*@sub\s+([0-9a-fA-F-]{36})\s*$/m);
  return { role: role?.[1] ?? null, sub: sub?.[1] ?? null };
}

async function main() {
  await loadEnv();
  const args = parseArgs(process.argv.slice(2));

  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error(
      '\n[test:db] SUPABASE_DB_URL is not set.\n\n' +
        '  Add a direct Postgres connection string for a STAGING database to .env:\n' +
        '    SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres\n\n' +
        '  Never use the production database. The runner rolls back, but a wrong URL\n' +
        '  is still a wrong URL.\n'
    );
    process.exit(2);
  }

  let Client;
  try {
    ({ Client } = await import('pg'));
  } catch {
    console.error('\n[test:db] The "pg" package is not installed. Run: npm install\n');
    process.exit(2);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
  } catch (err) {
    console.error(`\n[test:db] Could not connect: ${err.message}\n`);
    process.exit(2);
  }

  try {
    const { rows } = await client.query(
      'select current_database() as db, current_user as usr, version() as v'
    );
    const { db, usr } = rows[0];
    console.log(`[test:db] connected  db=${db}  user=${usr}`);

    if (args.check) {
      console.log('[test:db] connectivity OK');
      return 0;
    }

    let files;
    if (args.file) {
      files = [args.file];
    } else {
      try {
        files = (await readdir(testsDir))
          .filter((f) => f.toLowerCase().endsWith('.sql'))
          .sort()
          .map((f) => path.join(testsDir, f));
      } catch {
        console.error(`[test:db] no tests directory at ${testsDir}`);
        return 1;
      }
    }

    if (files.length === 0) {
      console.error('[test:db] no .sql tests found in database/tests/');
      return 1;
    }

    let passed = 0;
    const failures = [];

    for (const file of files) {
      const label = path.relative(root, file).replace(/\\/g, '/');
      const sql = await readFile(file, 'utf8');
      const { role, sub } = directives(sql);

      await client.query('begin');
      try {
        // `role` is regex-validated to [A-Za-z_][A-Za-z0-9_]* above, so it is safe to interpolate.
        if (role) await client.query(`set local role ${role}`);
        if (sub) {
          await client.query(
            `select set_config('request.jwt.claims', $1, true)`,
            [JSON.stringify({ sub, role: 'authenticated' })]
          );
        }
        await client.query(sql);
        await client.query('rollback');
        passed++;
        console.log(`  PASS  ${label}`);
      } catch (err) {
        await client.query('rollback').catch(() => {});
        failures.push({ label, message: err.message });
        console.log(`  FAIL  ${label}\n        ${err.message}`);
      }
    }

    console.log(`\n[test:db] ${passed}/${files.length} passed`);
    if (failures.length) {
      console.error(`[test:db] ${failures.length} failing:`);
      for (const f of failures) console.error(`  - ${f.label}: ${f.message}`);
      return 1;
    }
    return 0;
  } finally {
    await client.end().catch(() => {});
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`[test:db] unexpected error: ${err.stack || err.message}`);
    process.exit(1);
  });
