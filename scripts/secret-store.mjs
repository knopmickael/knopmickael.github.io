import { spawn } from 'node:child_process';
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

function dpapi(value, decrypt) {
  const script = `Add-Type -AssemblyName System.Security; $v=[Console]::In.ReadToEnd(); $b=[Convert]::FromBase64String($v); $r=[Security.Cryptography.ProtectedData]::${decrypt ? 'Unprotect' : 'Protect'}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($r))`;
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.stderr.resume();
    child.on('error', () => reject(new Error('Não foi possível acessar o DPAPI do Windows.')));
    child.stdin.on('error', () => {});
    child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error('Falha no armazenamento protegido. Execute pelo mesmo usuário do Windows.')));
    child.stdin.end(value);
  });
}
function key() {
  const bytes = Buffer.from(process.env.PORTFOLIO_SECRET_KEY || '', 'base64');
  if (bytes.length !== 32) throw new Error('Fora do Windows, configure PORTFOLIO_SECRET_KEY com 32 bytes aleatórios em base64 para proteger o OAuth.');
  return bytes;
}
export function createSecretStore(file) {
  let cached, loading;
  async function load() {
    let encrypted;
    try { encrypted = await readFile(file, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
    let raw;
    if (encrypted.startsWith('dpapi:')) {
      if (process.platform !== 'win32') throw new Error('Reconecte a conta no sistema atual.');
      raw = Buffer.from(await dpapi(encrypted.slice(6), true), 'base64');
    } else if (encrypted.startsWith('aes:')) {
      const bytes = Buffer.from(encrypted.slice(4), 'base64');
      const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
      decipher.setAuthTag(bytes.subarray(12, 28));
      raw = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
    } else throw new Error('Armazenamento OAuth inválido.');
    return JSON.parse(raw.toString('utf8'));
  }
  return {
    async get() {
      if (!cached) {
        loading ||= load();
        try { cached = await loading; } finally { loading = undefined; }
      }
      return structuredClone(cached);
    },
    async put(value) {
      if (loading) await loading;
      const raw = Buffer.from(JSON.stringify(value));
      let encrypted;
      if (process.platform === 'win32') encrypted = `dpapi:${await dpapi(raw.toString('base64'), false)}`;
      else {
        const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
        const body = Buffer.concat([cipher.update(raw), cipher.final()]);
        encrypted = `aes:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')}`;
      }
      await mkdir(dirname(file), { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, encrypted, { flag: 'wx', mode: 0o600, flush: true });
        await rename(temporary, file);
        cached = structuredClone(value);
      } finally { await rm(temporary, { force: true }); }
    }
  };
}
