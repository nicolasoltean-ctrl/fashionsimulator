import { describe, expect, it } from 'vitest';
import { assertPublicUrl } from '../server/proxy';

describe('import proxy address checks', () => {
  it('refuses anything that is not a public web address', async () => {
    const bad = [
      'ftp://example.com/file', 'file:///etc/passwd', 'javascript:alert(1)', 'not a url',
      'http://localhost:5173/', 'http://app.localhost/', 'http://printer.local/', 'http://db.internal/',
      'http://127.0.0.1/', 'http://127.1.2.3:8080/', 'http://10.0.0.5/', 'http://172.16.4.1/', 'http://192.168.1.1/',
      'http://169.254.169.254/latest/meta-data', 'http://100.64.0.1/', 'http://0.0.0.0/',
      'http://[::1]/', 'http://[::]/', 'http://[fd00::1]/', 'http://[fe80::1]/', 'http://[::ffff:10.0.0.1]/', 'http://[::ffff:7f00:1]/',
      'http://[64:ff9b::a00:1]/', 'http://[2002:c0a8:101::1]/', 'http://[ff02::1]/',
      'https://user:pass@example.com/',
    ];
    for (const url of bad) await expect(assertPublicUrl(url), url).rejects.toThrow();
  });

  it('accepts public literal addresses', async () => {
    await expect(assertPublicUrl('https://93.184.216.34/page')).resolves.toBeInstanceOf(URL);
    await expect(assertPublicUrl('http://[2606:2800:220:1:248:1893:25c8:1946]/')).resolves.toBeInstanceOf(URL);
    await expect(assertPublicUrl('http://[::ffff:93.184.216.34]/')).resolves.toBeInstanceOf(URL);
  });
});
