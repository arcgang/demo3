const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function getMigrationSql() {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
  const reviewsFile = files.find(f => /review/i.test(f));
  if (!reviewsFile) {
    throw new Error(`No SQL migration file matching /review/i found in ${MIGRATIONS_DIR}`);
  }
  return fs.readFileSync(path.join(MIGRATIONS_DIR, reviewsFile), 'utf8');
}

describe('reviews table migration file', () => {
  it('migrations directory exists', () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
  });

  it('a SQL migration file for reviews exists in migrations/', () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
    const reviewsFile = files.find(f => /review/i.test(f));
    expect(reviewsFile).toBeDefined();
  });
});

describe('reviews migration SQL content', () => {
  let sql;

  beforeAll(() => {
    sql = getMigrationSql();
  });

  it('creates the reviews table with IF NOT EXISTS (idempotent)', () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+reviews/i);
  });

  it('defines id as a serial primary key', () => {
    // Accepts SERIAL PRIMARY KEY or GENERATED ALWAYS AS IDENTITY PRIMARY KEY
    expect(sql).toMatch(/\bid\b[^,)]*(?:SERIAL|GENERATED\s+ALWAYS\s+AS\s+IDENTITY)[^,)]*PRIMARY\s+KEY/i);
  });

  it('defines car_id as an integer column', () => {
    expect(sql).toMatch(/\bcar_id\b[^,)]*\bINTEGER\b/i);
  });

  it('defines car_id with a foreign key referencing the cars table', () => {
    // FK may be inline or as a table constraint
    const inlineFk = /\bcar_id\b[^,)]*REFERENCES\s+cars/i.test(sql);
    const tableFk = /FOREIGN\s+KEY\s*\(\s*car_id\s*\)\s*REFERENCES\s+cars/i.test(sql);
    expect(inlineFk || tableFk).toBe(true);
  });

  it('defines reviewer_name as varchar', () => {
    expect(sql).toMatch(/\breviewer_name\b[^,)]*\bVARCHAR\b/i);
  });

  it('defines reviewer_name as NOT NULL', () => {
    expect(sql).toMatch(/\breviewer_name\b[^,)]*NOT\s+NULL/i);
  });

  it('defines rating as smallint', () => {
    expect(sql).toMatch(/\brating\b[^,)]*\bSMALLINT\b/i);
  });

  it('defines rating as NOT NULL', () => {
    expect(sql).toMatch(/\brating\b[^,)]*NOT\s+NULL/i);
  });

  it('adds a CHECK constraint on rating for values 1 through 5', () => {
    // Must enforce rating >= 1 AND rating <= 5 (or BETWEEN 1 AND 5)
    const checkBetween = /CHECK\s*\([^)]*\brating\b[^)]*BETWEEN\s+1\s+AND\s+5/i.test(sql);
    const checkExplicit =
      /CHECK\s*\([^)]*\brating\b[^)]*>=?\s*1[^)]*AND[^)]*rating[^)]*<=?\s*5/i.test(sql) ||
      /CHECK\s*\([^)]*\brating\b[^)]*<=?\s*5[^)]*AND[^)]*rating[^)]*>=?\s*1/i.test(sql);
    expect(checkBetween || checkExplicit).toBe(true);
  });

  it('defines comment as text', () => {
    expect(sql).toMatch(/\bcomment\b[^,)]*\bTEXT\b/i);
  });

  it('defines comment as NOT NULL', () => {
    expect(sql).toMatch(/\bcomment\b[^,)]*NOT\s+NULL/i);
  });

  it('defines created_at as timestamptz', () => {
    expect(sql).toMatch(/\bcreated_at\b[^,)]*\bTIMESTAMPTZ\b/i);
  });

  it('gives created_at a default of now()', () => {
    expect(sql).toMatch(/\bcreated_at\b[^,)]*DEFAULT\s+NOW\s*\(\s*\)/i);
  });

  it('creates an index on car_id with IF NOT EXISTS (idempotent)', () => {
    expect(sql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i);
    expect(sql).toMatch(/ON\s+reviews\s*\(\s*car_id\s*\)/i);
  });
});
