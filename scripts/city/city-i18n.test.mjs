import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  mapMessages,
  resolveMapLocale,
  getMapI18n,
  getBrowserMapLocale,
} from '../../packages/react-charts/src/city/i18n.js'

test('the map accepts both locales and uses English for unsupported languages', () => {
  assert.equal(resolveMapLocale('pt-BR'), 'pt-BR')
  assert.equal(resolveMapLocale('PT-br'), 'pt-BR')
  assert.equal(resolveMapLocale('en-US'), 'en-US')
  for (const language of [
    'pt',
    'pt-PT',
    'en-GB',
    'es-ES',
    'fr-FR',
    '',
    null,
    undefined,
  ]) {
    assert.equal(resolveMapLocale(language), 'en-US')
  }
  assert.equal(
    getBrowserMapLocale(),
    'en-US',
    'SSR does not depend on the host locale',
  )
})

test('complete catalogs preserve parameters and format numbers in the locale', () => {
  assert.deepEqual(
    Object.keys(mapMessages['pt-BR']).sort(),
    Object.keys(mapMessages['en-US']).sort(),
  )
  for (const [key, value] of Object.entries(mapMessages['pt-BR'])) {
    assert.ok(value.trim())
    const english = mapMessages['en-US'][key]
    assert.ok(english.trim())
    assert.deepEqual(
      value.match(/\{\w+\}/g)?.sort(),
      english.match(/\{\w+\}/g)?.sort(),
      key,
    )
  }
  const pt = getMapI18n('pt-BR')
  const en = getMapI18n('en-US')
  assert.equal(pt.format(2400.5), '2.400,5')
  assert.equal(en.format(2400.5), '2,400.5')
  assert.equal(pt.t('loadingCity', { page: 2 }), 'Carregando cidade 2…')
  assert.equal(en.t('loadingCity', { page: 2 }), 'Loading city 2…')
  assert.equal(getMapI18n('es-ES').t('title'), 'Business district')
})
