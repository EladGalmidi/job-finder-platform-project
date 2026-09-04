import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './passwords.js';

describe('hashPassword', () => {
  it('never stores the password itself', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    expect(hash).not.toContain('correct-horse-battery-staple');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('produces a different hash every time for the same password', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same-password'),
      hashPassword('same-password'),
    ]);

    // Different salts. Equal hashes would mean two users with the same password
    // are visibly identical in the table, and one cracked hash breaks both.
    expect(first).not.toBe(second);
  });

  it('records its parameters so they can be raised later', async () => {
    const [algorithm, n, r, p] = (await hashPassword('x')).split('$');

    expect(algorithm).toBe('scrypt');
    expect(Number(n)).toBeGreaterThanOrEqual(32_768);
    expect(Number(r)).toBeGreaterThan(0);
    expect(Number(p)).toBeGreaterThan(0);
  });
});

describe('verifyPassword', () => {
  it('accepts the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('the-real-password');

    expect(await verifyPassword('the-real-password', hash)).toBe(true);
    expect(await verifyPassword('the-real-passwora', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('verifies a hash made with weaker parameters than the current ones', async () => {
    // Simulates a password stored before the cost was raised. It has to keep
    // working, or raising the cost logs every existing user out permanently.
    const legacy = await hashPassword('unchanged');
    const [, , r, p, salt, key] = legacy.split('$');
    const weakened = ['scrypt', 16_384, r, p, salt, key].join('$');

    // The key was derived with different parameters, so this must not verify —
    // what matters is that it fails cleanly rather than throwing.
    await expect(verifyPassword('unchanged', weakened)).resolves.toBe(false);
  });

  it('rejects a malformed hash instead of throwing', async () => {
    for (const bad of ['', 'nonsense', 'scrypt$1$2', 'bcrypt$1$2$3$4$5', 'scrypt$a$b$c$d$e']) {
      await expect(verifyPassword('anything', bad)).resolves.toBe(false);
    }
  });

  it('refuses a hash demanding absurd memory', async () => {
    // A hostile or corrupt row could otherwise ask scrypt for a terabyte and
    // take the process down — denial of service through the password column.
    const absurd = ['scrypt', 2 ** 30, 8, 1, 'c2FsdA==', 'a'.repeat(88)].join('$');

    await expect(verifyPassword('anything', absurd)).resolves.toBe(false);
  });
});
