import { describe, expect, it } from 'vitest';

import { geocodeRequestCsv, parseGeocodeResponse } from './geocode-csv';

describe('géocodage CSV (API Adresse)', () => {
  it('envoie id, adresse et code INSEE', () => {
    expect(
      geocodeRequestCsv([{ id: '14', address: '2 rue de la République; bât. A' }], '37261'),
    ).toBe('id;adresse;citycode\r\n14;"2 rue de la République; bât. A";37261\r\n');
  });

  it('retient les positions de score ≥ 0,6, refuse les autres', () => {
    const response = [
      'id;adresse;citycode;latitude;longitude;result_label;result_score',
      '2;2 rue Haute;37261;47.39;0.68;2 Rue Haute 37700 Saint-Pierre-des-Corps;0.91',
      '3;rue inconnue;37261;47.4;0.7;Rue Inconnue;0.42',
      '4;???;37261;;;;',
    ].join('\n');
    const result = parseGeocodeResponse(response);
    expect(result.get('2')).toEqual({ lat: 47.39, lng: 0.68 });
    expect(result.get('3')).toBeNull();
    expect(result.get('4')).toBeNull();
  });
});
