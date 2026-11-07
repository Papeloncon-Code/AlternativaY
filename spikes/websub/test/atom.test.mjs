import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAtom, hmacSha1Hex, safeEqual, isFresh } from '../src/atom.js';

const PUSH = `<?xml version='1.0' encoding='UTF-8'?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
 <link rel="hub" href="https://pubsubhubbub.appspot.com"/>
 <title>YouTube video feed</title>
 <entry>
  <id>yt:video:VIDEO_ID01</id>
  <yt:videoId>VIDEO_ID01</yt:videoId>
  <yt:channelId>UCaaaaaaaaaaaaaaaaaaaaaa</yt:channelId>
  <title>Hola &amp; adiós</title>
  <published>2026-11-06T20:00:00+00:00</published>
  <updated>2026-11-06T20:01:30.123456789+00:00</updated>
 </entry>
</feed>`;

const DELETED = `<feed xmlns:at="http://purl.org/atompub/tombstones/1.0" xmlns="http://www.w3.org/2005/Atom">
 <at:deleted-entry ref="yt:video:GONE1234567" when="2026-11-06T21:00:00+00:00"><link href="x"/></at:deleted-entry></feed>`;

test('parsea una entrada de push WebSub', () => {
  const { entries, deleted } = parseAtom(PUSH);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].videoId, 'VIDEO_ID01');
  assert.equal(entries[0].channelId, 'UCaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(entries[0].title, 'Hola & adiós');
  assert.equal(entries[0].published, Date.parse('2026-11-06T20:00:00Z'));
  assert.ok(entries[0].updated > entries[0].published);
  assert.equal(deleted.length, 0);
});

test('parsea un deleted-entry', () => {
  const { entries, deleted } = parseAtom(DELETED);
  assert.equal(entries.length, 0);
  assert.deepEqual(deleted, [{ videoId: 'GONE1234567', when: Date.parse('2026-11-06T21:00:00Z') }]);
});

test('limita el número de entradas', () => {
  const many = '<feed>' + Array.from({ length: 10 }, (_, i) => `<entry><yt:videoId>v${i}</yt:videoId></entry>`).join('') + '</feed>';
  assert.equal(parseAtom(many, 3).entries.length, 3);
});

test('HMAC-SHA1 coincide con un vector conocido (RFC 2202, caso 2)', async () => {
  assert.equal(await hmacSha1Hex('Jefe', 'what do ya want for nothing?'), 'effcdf6ae5eb2fa2d27416d5f184df9c259a7c79');
});

test('safeEqual', () => {
  assert.ok(safeEqual('abc', 'abc'));
  assert.ok(!safeEqual('abc', 'abd'));
  assert.ok(!safeEqual('abc', 'ab'));
  assert.ok(!safeEqual(undefined, 'ab'));
});

test('isFresh: ventana de 48 h', () => {
  const now = Date.parse('2026-11-06T22:00:00Z');
  assert.ok(isFresh(now - 3600e3, now));
  assert.ok(!isFresh(now - 49 * 3600e3, now));
  assert.ok(!isFresh(null, now));
});
