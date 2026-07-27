import crypto from 'crypto';
import env from '../config/env';
import logger from './logger';

let cachedPrivateKey: string | null = null;
let cachedPublicKey: string | null = null;
let cachedKid: string | null = null;

// Initialize keys and validate parameters
export function initializeKeys() {
  if (cachedPrivateKey && cachedPublicKey) {
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey, kid: cachedKid! };
  }

  const isProduction = env.NODE_ENV === 'production';

  if (env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY) {
    // Persistent keys loaded from environment variables
    const privKey = env.JWT_PRIVATE_KEY.trim();
    const pubKey = env.JWT_PUBLIC_KEY.trim();

    try {
      // Validate that private key is valid EC
      const privateKeyObj = crypto.createPrivateKey({
        key: privKey,
        format: 'pem',
      });
      if (privateKeyObj.asymmetricKeyType !== 'ec') {
        throw new Error('Asymmetric key type is not EC');
      }

      // Validate public key SPKI
      const publicKeyObj = crypto.createPublicKey({
        key: pubKey,
        format: 'pem',
      });
      if (publicKeyObj.asymmetricKeyType !== 'ec') {
        throw new Error('Asymmetric key type is not EC');
      }

      // Verify that public key uses the P-256 curve
      const jwk = publicKeyObj.export({ format: 'jwk' });
      if (jwk.crv !== 'P-256') {
        throw new Error('Curve name must be P-256');
      }

      // Verify that public and private keys are a matching pair
      const signObj = crypto.createSign('SHA256');
      signObj.update('validation-check');
      const signature = signObj.sign(privateKeyObj);
      const verifyObj = crypto.createVerify('SHA256');
      verifyObj.update('validation-check');
      if (!verifyObj.verify(publicKeyObj, signature)) {
        throw new Error('Private and public keys are not a matching pair');
      }

      cachedPrivateKey = privKey;
      cachedPublicKey = pubKey;
      // Generate kid from SHA-256 fingerprint of the public key
      cachedKid = crypto.createHash('sha256').update(pubKey).digest('base64url');

      logger.info('Asymmetric ES256 signing keys initialized from environment variables');
    } catch (err: any) {
      logger.error(`Failed to load persistent production signing keys: ${err.message}`);
      if (isProduction) {
        process.exit(1);
      }
      throw err;
    }
  } else if (!isProduction && env.ALLOW_DEV_EPHEMERAL_KEYS) {
    // Generate development-only ephemeral keys
    logger.warn('⚠️ WARNING: JWT signing keys are not configured. Generating ephemeral development-only keys.');
    logger.warn('⚠️ WARNING: Application restarts will invalidate all active client sessions.');

    try {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      cachedPrivateKey = privateKey.toString().trim();
      cachedPublicKey = publicKey.toString().trim();
      cachedKid = crypto.createHash('sha256').update(cachedPublicKey).digest('base64url');

      logger.info('Ephemeral P-256 key pair generated successfully');
    } catch (err: any) {
      logger.error(`Failed to generate ephemeral keys: ${err.message}`);
      process.exit(1);
    }
  } else {
    // Missing keys in production or missing allow dev flag in development
    logger.error('CRITICAL: JWT signing keys are missing. Application cannot start securely.');
    process.exit(1);
  }

  return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey, kid: cachedKid! };
}

// Retrieves the JWKS containing only the public key
export function getJWKS() {
  const { publicKey, kid } = initializeKeys();
  const pubKeyObj = crypto.createPublicKey({
    key: publicKey,
    format: 'pem',
  });
  
  const jwk = pubKeyObj.export({ format: 'jwk' });
  
  return {
    keys: [
      {
        kty: 'EC',
        use: 'sig',
        alg: 'ES256',
        crv: 'P-256',
        kid,
        x: jwk.x,
        y: jwk.y,
      },
    ],
  };
}

// Timing-safe comparison of strings to mitigate timing side-channel attacks
export function timingSafeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    // Run comparison on identical strings to consume similar CPU time
    crypto.timingSafeEqual(aBuffer, aBuffer);
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

// Reset key cache (used for unit tests)
export function resetCachedKeys() {
  cachedPrivateKey = null;
  cachedPublicKey = null;
  cachedKid = null;
}
