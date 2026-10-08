import { describe, expect, it } from 'vitest';
import * as queryString from 'query-string';

describe('Expo Router runtime compatibility', () => {
  it('provides the named stringify export used for routes with parameters', () => {
    expect(typeof queryString.stringify).toBe('function');
    expect(queryString.stringify({ id: 'order-1' })).toBe('id=order-1');
  });
});
