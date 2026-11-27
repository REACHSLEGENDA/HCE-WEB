// Países del registro: un mismo país escrito de varias formas se guarda y se
// agrupa con un solo nombre; la lada sale del país de la visita.
import { describe, expect, it } from 'vitest';
import { normalizarPais, paisPorIso, paisPorLada } from '../src/lib/paises';

describe('normalizarPais', () => {
  it('une mayúsculas, espacios y acentos de un país conocido', () => {
    for (const texto of ['Bolivia', 'bolivia', 'BOLIVIA', '  bolivia  ']) expect(normalizarPais(texto)).toBe('Bolivia');
    expect(normalizarPais('mexico')).toBe('México');
    expect(normalizarPais('PERÚ')).toBe('Perú');
  });

  it('reconoce otras formas comunes', () => {
    expect(normalizarPais('EEUU')).toBe('Estados Unidos');
    expect(normalizarPais('Estado Plurinacional de Bolivia')).toBe('Bolivia');
  });

  it('a un país desconocido le pone mayúscula inicial', () => {
    expect(normalizarPais('reino   unido')).toBe('Reino Unido');
  });

  it('vacío se queda vacío', () => {
    expect(normalizarPais('')).toBe('');
    expect(normalizarPais(null)).toBe('');
  });
});

describe('lada por país', () => {
  it('Bolivia usa +591 y 8 dígitos', () => {
    expect(paisPorIso('bo')).toMatchObject({ lada: '+591', digitos: '8', nombre: 'Bolivia' });
    expect(paisPorLada('+591').nombre).toBe('Bolivia');
  });

  it('un país fuera de la lista no regresa nada', () => {
    expect(paisPorIso('JP')).toBeNull();
  });
});
