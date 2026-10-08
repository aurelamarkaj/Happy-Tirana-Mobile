import { z } from 'zod';

function normalizeMapsUrl(raw: string) {
  const input = new URL(raw.trim());
  if (['comgooglemaps:', 'comgooglemaps-x-callback:'].includes(input.protocol)) {
    const url = new URL('https://www.google.com/maps');
    for (const key of ['q', 'daddr', 'center']) {
      const value = input.searchParams.get(key);
      if (value) url.searchParams.set(key, value);
    }
    return url;
  }
  if (input.protocol === 'comgooglemapsurl:') return new URL(raw.trim().replace(/^comgooglemapsurl:/i, 'https:'));
  if (input.protocol === 'geo:') {
    const url = new URL('https://www.google.com/maps');
    url.searchParams.set('q', input.searchParams.get('q') || input.pathname);
    return url;
  }
  if (input.protocol === 'http:') input.protocol = 'https:';
  return input;
}

function isGoogleDomain(host: string) {
  const root = host.replace(/^(www|m|maps)\./, '');
  return root === 'google.com' || root === 'google.cat' ||
    /^google\.[a-z]{2}$/.test(root) || /^google\.(?:co|com)\.[a-z]{2}$/.test(root);
}

export function normalizeGoogleMapsUrl(raw: string) {
  const url = normalizeMapsUrl(raw);
  const host = url.hostname.toLowerCase();
  if (isGoogleDomain(host) && host.replace(/^(www|m|maps)\./, '') !== 'google.com') {
    url.hostname = host.startsWith('maps.') ? 'maps.google.com' : 'www.google.com';
  } else if (isGoogleDomain(host) && host.startsWith('m.')) {
    url.hostname = 'www.google.com';
  }

  // Older deployed APIs accept canonical coordinate queries but reject some
  // otherwise-valid localized /maps/place and /maps/@ share links.
  if (isGoogleDomain(url.hostname.toLowerCase()) && !url.searchParams.has('q')) {
    const coordinateMatch = decodeURIComponent(url.pathname).match(
      /(?:\/(?:place|search)\/|\/@)([+-]?\d{1,2}(?:\.\d+)?),\+?([+-]?\d{1,3}(?:\.\d+)?)(?:[,/]|$)/,
    );
    if (coordinateMatch) {
      const canonical = new URL('https://www.google.com/maps');
      canonical.searchParams.set('q', `${Number(coordinateMatch[1])},${Number(coordinateMatch[2])}`);
      return canonical.href;
    }
  }
  return url.href;
}

// Mirrors the accepted sharing/custom-map formats from apps/api/src/maps-location.ts.
export function isGoogleMapsUrl(raw: string) {
  try {
    const url = normalizeMapsUrl(raw);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      (host === 'maps.app.goo.gl' || host === 'g.page' ||
       (host === 'goo.gl' && /^\/maps(?:\/|$)/.test(url.pathname)) ||
       (isGoogleDomain(host) && (host.startsWith('maps.') || /^\/maps(?:\/|$)/.test(url.pathname))));
  } catch { return false; }
}
const optionalCoordinate = (min: number, max: number) => z.preprocess(value => value === '' || value === null ? undefined : value, z.coerce.number().finite().min(min).max(max).optional());
// Server business-orders.ts:8–33; signed orderValue is intentional.
export const businessQuoteSchema = z.object({
  addressText: z.string().trim().max(1000).optional(), lat: optionalCoordinate(-90, 90), lng: optionalCoordinate(-180, 180),
  googleMapsUrl: z.string().trim().min(1, 'Vendos linkun e Google Maps.').max(2048)
    .refine(isGoogleMapsUrl, 'Vendos një link të vlefshëm të Google Maps.')
    .transform(normalizeGoogleMapsUrl),
});
export const businessOrderSchema = businessQuoteSchema.extend({
  customerName: z.string().trim().max(150).optional(),
  customerPhone: z.string().trim().regex(/^\+?[\d\s()-]{6,25}$/, 'Shkruaj një numër telefoni të vlefshëm.').refine(value => value.replace(/\D/g, '').length >= 6, 'Numri duhet të ketë të paktën 6 shifra.'),
  orderValue: z.number().finite().min(-9999999).max(9999999).multipleOf(0.01),
  productDescription: z.string().trim().max(2000).optional(),
  readyMinutes: z.preprocess(value => value === '' || value === null ? undefined : value, z.number().int().min(0).max(180)),
});
export type BusinessOrderInput = z.output<typeof businessOrderSchema>;
// UI fields are strings; only this boundary converts them into server numbers.
const amount = z.string().trim().min(1, 'Vendos vlerën e porosisë.').regex(/^[+-]?\d+(?:[.,]\d{1,2})?$/, 'Përdor një numër me deri në 2 shifra dhjetore.').transform(value => Number(value.replace(',', '.'))).pipe(businessOrderSchema.shape.orderValue);
const minutes = z.string().trim().regex(/^\d+$/, 'Vendos minutat 0–180.').transform(Number).pipe(z.number().int().min(0).max(180));
export const businessOrderFormSchema = z.object({
  customerName: z.string().trim().max(150), customerPhone: businessOrderSchema.shape.customerPhone,
  googleMapsUrl: businessQuoteSchema.shape.googleMapsUrl, readyMinutes: minutes, orderValue: amount,
  productDescription: z.string().trim().max(2000),
});
export type BusinessFormValues = z.input<typeof businessOrderFormSchema>;
export type BusinessFormOutput = z.output<typeof businessOrderFormSchema>;
export const emptyBusinessForm: BusinessFormValues = { customerName: '', customerPhone: '', googleMapsUrl: '', readyMinutes: '', orderValue: '', productDescription: '' };

export async function prepareGoogleMapsUrl(raw: string, fetcher: typeof fetch = fetch) {
  const normalized = businessQuoteSchema.shape.googleMapsUrl.parse(raw);
  const host = new URL(normalized).hostname.toLowerCase();
  if (!['maps.app.goo.gl', 'g.page', 'goo.gl'].includes(host)) return normalized;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher(normalized, {
      method: 'GET', redirect: 'follow', credentials: 'omit', signal: controller.signal,
    });
    const resolved = response.url;
    if (!resolved || !isGoogleMapsUrl(resolved)) return normalized;
    return normalizeGoogleMapsUrl(resolved);
  } catch {
    // Let the API try the original short link when Google is temporarily unavailable.
    return normalized;
  } finally {
    clearTimeout(timeout);
  }
}
