import QRCode from 'qrcode';

export const QR_KINDS = { url: 'Link do strony', text: 'Dowolny tekst', wifi: 'Sieć Wi-Fi', email: 'E-mail', phone: 'Telefon', vcard: 'Wizytówka (vCard)' };

export const QR_FIELDS = {
  url: [{ key: 'url', label: 'Adres strony', type: 'url', placeholder: 'www.twojastrona.pl' }],
  text: [{ key: 'text', label: 'Tekst', type: 'textarea', placeholder: 'Dowolna wiadomość' }],
  wifi: [
    { key: 'ssid', label: 'Nazwa sieci (SSID)', type: 'text' },
    { key: 'password', label: 'Hasło', type: 'text' },
    { key: 'security', label: 'Zabezpieczenie', type: 'select', options: { WPA: 'WPA/WPA2/WPA3', WEP: 'WEP', nopass: 'Brak hasła' } },
    { key: 'hidden', label: 'Sieć ukryta', type: 'select', options: { false: 'Nie', true: 'Tak' } },
  ],
  email: [
    { key: 'email', label: 'Adres e-mail', type: 'email', placeholder: 'kontakt@firma.pl' },
    { key: 'subject', label: 'Temat (opcjonalnie)', type: 'text' },
    { key: 'body', label: 'Treść (opcjonalnie)', type: 'textarea' },
  ],
  phone: [{ key: 'phone', label: 'Numer telefonu', type: 'tel', placeholder: '+48 600 100 200' }],
  vcard: [
    { key: 'firstName', label: 'Imię', type: 'text' },
    { key: 'lastName', label: 'Nazwisko', type: 'text' },
    { key: 'org', label: 'Firma', type: 'text' },
    { key: 'title', label: 'Stanowisko', type: 'text' },
    { key: 'phone', label: 'Telefon', type: 'tel' },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'url', label: 'Strona www', type: 'url' },
  ],
};

const MAX_PAYLOAD = 1200;
const wifiEscape = (s = '') => String(s).replace(/([\\;,:"])/g, '\\$1');
const vEscape = (s = '') => String(s).replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');
const trim = (s) => String(s ?? '').trim();

export function buildQrPayload(kind, data = {}) {
  switch (kind) {
    case 'url': {
      const url = trim(data.url);
      if (!url) return '';
      return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    }
    case 'text':
      return String(data.text ?? '');
    case 'wifi': {
      const security = ['WPA', 'WEP', 'nopass'].includes(data.security) ? data.security : 'WPA';
      let s = `WIFI:T:${security};S:${wifiEscape(trim(data.ssid))};`;
      if (security !== 'nopass') s += `P:${wifiEscape(data.password ?? '')};`;
      if (data.hidden === 'true') s += 'H:true;';
      return `${s};`;
    }
    case 'email': {
      const params = [];
      if (trim(data.subject)) params.push(`subject=${encodeURIComponent(trim(data.subject))}`);
      if (trim(data.body)) params.push(`body=${encodeURIComponent(trim(data.body))}`);
      return `mailto:${trim(data.email)}${params.length ? `?${params.join('&')}` : ''}`;
    }
    case 'phone':
      return `tel:${trim(data.phone).replace(/[^\d+]/g, '')}`;
    case 'vcard': {
      const first = trim(data.firstName);
      const last = trim(data.lastName);
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEscape(last)};${vEscape(first)};;;`, `FN:${vEscape([first, last].filter(Boolean).join(' '))}`];
      const optional = [['ORG', data.org], ['TITLE', data.title], ['TEL', data.phone], ['EMAIL', data.email], ['URL', data.url]];
      for (const [key, value] of optional) if (trim(value)) lines.push(`${key}:${vEscape(trim(value))}`);
      lines.push('END:VCARD');
      return lines.join('\r\n');
    }
    default:
      return '';
  }
}

export function qrValidationError(kind, data = {}) {
  if (kind === 'url' && !trim(data.url)) return 'Wpisz adres strony.';
  if (kind === 'text' && !trim(data.text)) return 'Wpisz tekst do zakodowania.';
  if (kind === 'wifi' && !trim(data.ssid)) return 'Wpisz nazwę sieci Wi-Fi.';
  if (kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim(data.email))) return 'Niepoprawny adres e-mail.';
  if (kind === 'phone' && trim(data.phone).replace(/[^\d]/g, '').length < 3) return 'Wpisz poprawny numer telefonu.';
  if (kind === 'vcard' && !trim(data.firstName) && !trim(data.lastName) && !trim(data.org)) return 'Podaj imię, nazwisko lub firmę.';
  if (new TextEncoder().encode(buildQrPayload(kind, data)).length > MAX_PAYLOAD) return 'Za dużo danych dla kodu QR — skróć treść.';
  return null;
}

export function qrMatrix(payload, ecl = 'M') {
  if (!payload) return null;
  try {
    const qr = QRCode.create(payload, { errorCorrectionLevel: ecl });
    const { modules } = qr;
    return { size: modules.size, isDark: (row, col) => !!modules.get(row, col) };
  } catch {
    return null;
  }
}
