import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

interface ScryptParams {
  readonly N: number;
  readonly r: number;
  readonly p: number;
}

/**
 * Wrapped by hand rather than with promisify, whose typings resolve to the
 * three-argument overload and drop the options object that carries the cost
 * parameters.
 */
const scryptAsync = (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });

/**
 * scrypt work factors.
 *
 * N is the cost: doubling it doubles both time and memory. 2^16 with r=8 costs
 * roughly 64MB and a tenth of a second per hash, which is deliberately slow —
 * the whole point is that an attacker with the password table cannot try
 * billions of candidates cheaply.
 *
 * These are recorded inside every stored hash rather than assumed, so they can
 * be raised later without invalidating the passwords already in the database.
 * An old hash keeps verifying with its own parameters.
 */
const PARAMS: ScryptParams = { N: 65_536, r: 8, p: 1 };

/** scrypt needs headroom above 128 * r * N, or it refuses to run. */
const MAX_MEMORY = 128 * PARAMS.r * PARAMS.N * 2;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

const derive = (password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> =>
  // Unicode-normalised, so a password typed with a composed accent still
  // matches the decomposed form the same person types on another keyboard.
  scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    ...params,
    maxmem: 128 * params.r * params.N * 2,
  });

/**
 * Hashes a password for storage.
 *
 * The result carries its own algorithm and parameters, so verification never
 * has to guess how an old hash was produced:
 *   scrypt$N$r$p$<salt base64>$<hash base64>
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await derive(password, salt, PARAMS);

  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
};

/**
 * Checks a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed hash: a corrupt row must
 * not let anyone in, and must not crash the login route either.
 */
export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;

  const params = { N: Number(rawN), r: Number(rawR), p: Number(rawP) };
  if (!Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) {
    return false;
  }
  // A hostile row could otherwise ask for a terabyte of memory and take the
  // process down — a denial of service through the password column.
  if (128 * params.r * params.N * 2 > MAX_MEMORY) return false;

  const salt = Buffer.from(rawSalt ?? '', 'base64');
  const expected = Buffer.from(rawHash ?? '', 'base64');
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;

  const actual = await derive(password, salt, params);

  // Constant-time: a byte-by-byte comparison leaks how much of the hash matched
  // through how long it took to say no.
  return timingSafeEqual(actual, expected);
};
