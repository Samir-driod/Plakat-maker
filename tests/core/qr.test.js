import { describe, it, expect } from 'vitest';
import { buildQrPayload, qrValidationError, qrMatrix, QR_KINDS, QR_FIELDS } from '../../src/core/qr.js';

describe('buildQrPayload', () => {
  it('link: dopisuje https://', () => {
    expect(buildQrPayload('url', { url: 'mojastrona.pl' })).toBe('https://mojastrona.pl');
    expect(buildQrPayload('url', { url: ' http://a.pl ' })).toBe('http://a.pl');
    expect(buildQrPayload('url', { url: 'mailto:x@y.pl' })).toBe('mailto:x@y.pl');
  });
  it('Wi-Fi z ucieczką znaków specjalnych', () => {
    expect(buildQrPayload('wifi', { ssid: 'Dom;1', password: 'a:b', security: 'WPA', hidden: 'false' }))
      .toBe('WIFI:T:WPA;S:Dom\\;1;P:a\\:b;;');
    expect(buildQrPayload('wifi', { ssid: 'Kawiarnia', security: 'nopass', hidden: 'true' }))
      .toBe('WIFI:T:nopass;S:Kawiarnia;H:true;;');
  });
  it('e-mail z tematem', () => {
    expect(buildQrPayload('email', { email: 'jan@firma.pl', subject: 'Cześć!', body: '' }))
      .toBe('mailto:jan@firma.pl?subject=Cze%C5%9B%C4%87!');
  });
  it('telefon', () => {
    expect(buildQrPayload('phone', { phone: '+48 600-100-200' })).toBe('tel:+48600100200');
  });
  it('wizytówka vCard', () => {
    const v = buildQrPayload('vcard', { firstName: 'Jan', lastName: 'Kowalski', org: 'Firma, S.A.', phone: '600100200', email: '', url: '' });
    expect(v).toBe(['BEGIN:VCARD', 'VERSION:3.0', 'N:Kowalski;Jan;;;', 'FN:Jan Kowalski', 'ORG:Firma\\, S.A.', 'TEL:600100200', 'END:VCARD'].join('\r\n'));
  });
  it('wizytówka z samą firmą: FN zastępuje firma (vCard 3.0 wymaga niepustego FN)', () => {
    const v = buildQrPayload('vcard', { org: 'Firma, S.A.' });
    expect(v.split('\r\n')).toContain('FN:Firma\\, S.A.');
  });
  it('tekst', () => {
    expect(buildQrPayload('text', { text: 'Dzień dobry' })).toBe('Dzień dobry');
  });
});

describe('qrValidationError', () => {
  it('zgłasza brakujące dane', () => {
    expect(qrValidationError('url', { url: '' })).toMatch(/adres/);
    expect(qrValidationError('wifi', { ssid: '' })).toMatch(/sieci/);
    expect(qrValidationError('email', { email: 'zly' })).toMatch(/e-mail/);
    expect(qrValidationError('phone', { phone: 'abc' })).toMatch(/telefonu/);
    expect(qrValidationError('text', { text: 'x'.repeat(1500) })).toMatch(/Za dużo/);
  });
  it('akceptuje poprawne dane', () => {
    expect(qrValidationError('url', { url: 'a.pl' })).toBeNull();
    expect(qrValidationError('vcard', { firstName: 'Jan' })).toBeNull();
  });
  it('akceptuje wizytówkę z samą firmą', () => {
    expect(qrValidationError('vcard', { org: 'Firma' })).toBeNull();
  });
});

describe('qrMatrix', () => {
  it('tworzy macierz z wzorem pozycjonującym w rogu', () => {
    const m = qrMatrix('https://example.com', 'M');
    expect(m.size).toBeGreaterThanOrEqual(21);
    expect(m.isDark(0, 0)).toBe(true);
    expect(m.isDark(1, 1)).toBe(false);
  });
  it('wyższa korekcja = większa lub równa macierz', () => {
    expect(qrMatrix('https://example.com', 'H').size).toBeGreaterThanOrEqual(qrMatrix('https://example.com', 'L').size);
  });
  it('pusta treść → null', () => {
    expect(qrMatrix('')).toBeNull();
  });
  it('każdy typ ma pola formularza', () => {
    for (const kind of Object.keys(QR_KINDS)) expect(QR_FIELDS[kind].length).toBeGreaterThan(0);
  });
});
