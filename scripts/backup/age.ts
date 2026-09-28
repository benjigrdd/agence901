/**
 * Chiffrement des sauvegardes avec age (format standard, compatible avec la commande `age`).
 *
 *   tsx scripts/backup/age.ts keygen                 → cle privee (a conserver HORS LIGNE) + cle publique
 *   tsx scripts/backup/age.ts encrypt <entree> <sortie>   (destinataires : ops/backup/age-recipients.txt)
 *   AGE_IDENTITY=… tsx scripts/backup/age.ts decrypt <entree> <sortie>
 *
 * La cle privee n'est jamais dans le depot : secret de l'environnement GitHub protege `restore` et copie
 * hors ligne chez l'editeur (docs/runbooks/restauration.md).
 */
import { createReadStream, createWriteStream, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { Decrypter, Encrypter, generateX25519Identity, identityToRecipient } from 'age-encryption';

const RECIPIENTS_FILE = resolve(import.meta.dirname, '../../ops/backup/age-recipients.txt');

/** Cles publiques (une par ligne, commentaires `#` ignores). */
export function readRecipients(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

export async function encryptFile(input: string, output: string, recipients: string[]): Promise<void> {
  if (recipients.length === 0) throw new Error('Aucune cle publique age : voir ops/backup/age-recipients.txt');
  const encrypter = new Encrypter();
  for (const r of recipients) encrypter.addRecipient(r);
  const encrypted = await encrypter.encrypt(Readable.toWeb(createReadStream(input)) as ReadableStream<Uint8Array>);
  await pipeline(Readable.fromWeb(encrypted), createWriteStream(output));
}

export async function decryptFile(input: string, output: string, identity: string): Promise<void> {
  const decrypter = new Decrypter();
  decrypter.addIdentity(identity);
  const decrypted = await decrypter.decrypt(Readable.toWeb(createReadStream(input)) as ReadableStream<Uint8Array>);
  await pipeline(Readable.fromWeb(decrypted), createWriteStream(output));
}

async function main() {
  const [command, input, output] = process.argv.slice(2);
  if (command === 'keygen') {
    const identity = await generateX25519Identity();
    console.log(`# Cle privee (hors ligne + secret AGE_IDENTITY de l'environnement « restore ») :\n${identity}`);
    console.log(`# Cle publique (a ajouter dans ops/backup/age-recipients.txt) :\n${await identityToRecipient(identity)}`);
  } else if (command === 'encrypt' && input && output) {
    const recipients = readRecipients(process.env.AGE_RECIPIENTS ?? readFileSync(RECIPIENTS_FILE, 'utf8'));
    await encryptFile(input, output, recipients);
  } else if (command === 'decrypt' && input && output) {
    const identity = process.env.AGE_IDENTITY;
    if (!identity) throw new Error('AGE_IDENTITY manquante');
    await decryptFile(input, output, identity.trim());
  } else {
    console.error('Usage : age.ts keygen | encrypt <entree> <sortie> | decrypt <entree> <sortie>');
    process.exit(2);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
