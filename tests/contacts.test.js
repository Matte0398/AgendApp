import test from 'node:test';
import assert from 'node:assert/strict';
import { demoContacts, filterContacts, contactsToCsv, parseCsv, isContactList, duplicateOf, planImport, validateContact, applyImport } from '../src/contacts.js';

test('search is accent- and case-insensitive and works across fields', () => {
  assert.equal(filterContacts(demoContacts, { query: 'muller BERLINO' })[0].id, 'demo-1');
  assert.equal(filterContacts(demoContacts, { country: 'Italia', view: 'favorites' })[0].id, 'demo-3');
});

test('sorting does not mutate the source', () => {
  const snapshot = structuredClone(demoContacts);
  filterContacts(demoContacts, { sort: 'city' });
  assert.deepEqual(demoContacts, snapshot);
});

test('saved contacts have valid models and unique IDs', () => {
  assert.equal(isContactList(demoContacts), true);
  assert.equal(isContactList([demoContacts[0], demoContacts[0]]), false);
  assert.equal(isContactList([{ id: 'bad' }]), false);
});

test('Italian and English CSV round-trip including multiline and accented data', () => {
  for (const language of ['it', 'en']) {
    const csv = contactsToCsv(demoContacts, language);
    const loaded = parseCsv(csv);
    assert.equal(loaded.length, 3);
    assert.equal(loaded[0].lastName, 'Müller');
    assert.equal(loaded[0].email, demoContacts[0].email);
  }
  const value = { ...demoContacts[0], notes: 'Riga 1; "test"\nRiga 2' };
  assert.equal(parseCsv(contactsToCsv([value]))[0].notes, value.notes);
});

test('CSV formula injection is neutralized', () => {
  const csv = contactsToCsv([{ ...demoContacts[0], firstName: '=HYPERLINK("test")' }]);
  assert.ok(csv.includes('"\'=HYPERLINK(""test"")"'));
});

test('duplicate checking handles email, phone and names', () => {
  assert.equal(duplicateOf({ firstName: 'New', lastName: 'Person', email: 'GERD.MULLER@example.com' }, demoContacts)?.id, 'demo-1');
  assert.equal(duplicateOf({ firstName: 'New', lastName: 'Person', phone: '+49 30 0000001' }, demoContacts)?.id, 'demo-1');
  assert.equal(duplicateOf({ firstName: 'GERD', lastName: 'Muller' }, demoContacts)?.id, 'demo-1');
});

test('import plan skips existing and within-file duplicates', () => {
  const result = planImport([
    { firstName: 'Gerd', lastName: 'Muller' },
    { firstName: 'Anna', lastName: 'Verdi' },
    { firstName: 'Anna', lastName: 'Verdi' },
  ], demoContacts);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.duplicates.length, 2);
});


test('optional contact fields share validation for new and existing contacts', () => {
  for (const id of [undefined, 'existing']) {
    const contact = { ...demoContacts[0], id, phone: '', email: '' };
    assert.deepEqual(validateContact(contact), {});
    for (const phone of ['123456', '123456789', '1234567890123456', '+39 abc 1234567', '123+4567']) {
      assert.equal(validateContact({ ...contact, phone }).phone, 'invalidPhone');
    }

    for (const phone of ['1234567890', '+39 (071) 000-0002', '+39 12345678', '123456789012345']) {
      assert.deepEqual(validateContact({ ...contact, phone }), {});
    }

    assert.equal(validateContact({ ...contact, email: 'bad@' }).email, 'invalidEmail');
    assert.deepEqual(validateContact({ ...contact, email: 'contact@example.com' }), {});
  }

});


test('mixed CSV import isolates invalid contacts and duplicates', () => {
  const incoming = parseCsv('Nome;Cognome;Telefono;Email\nGerd;Muller;;\nAnna;Verdi;1234567890;anna@example.com\nWrong;Phone;123456789;\n;Missing;;\nWrong;Email;;bad@');
  const plan = planImport(incoming, demoContacts);
  assert.equal(plan.accepted.length, 1);
  assert.equal(plan.duplicates.length, 1);
  assert.deepEqual(plan.invalid.map(item => item.row), [4, 5, 6]);
  const outcome = applyImport(incoming, demoContacts);
  assert.equal(outcome.imported, 1);
  assert.equal(outcome.skipped, 1);
  assert.equal(outcome.invalid, 3);
  assert.equal(outcome.contacts.length, 4);
});


test('updates require opt-in and preserve IDs and favorites', () => {
  const incoming = [{ ...demoContacts[0], id: undefined, city: 'Example city' }];
  const original = structuredClone(demoContacts);
  const skipped = applyImport(incoming, demoContacts);
  assert.equal(skipped.imported, 0);
  assert.equal(skipped.updated, 0);
  assert.equal(skipped.skipped, 1);
  const updated = applyImport(incoming, demoContacts, true);
  assert.equal(updated.updated, 1);
  assert.equal(updated.contacts[0].city, 'Example city');
  assert.equal(updated.contacts[0].id, demoContacts[0].id);
  assert.equal(updated.contacts[0].favorite, demoContacts[0].favorite);
  assert.deepEqual(demoContacts, original);
});


test('ambiguous matches and repeated CSV updates are not overwritten', () => {
  const conflicting = { ...demoContacts[0], id: undefined, email: demoContacts[1].email };
  assert.equal(planImport([conflicting], demoContacts).updates.length, 0);
  const incoming = [{ ...demoContacts[0], id: undefined }, { ...demoContacts[0], id: undefined }];
  const outcome = applyImport(incoming, demoContacts, true);
  assert.equal(outcome.updated, 1);
  assert.equal(outcome.skipped, 1);
});


test('CSV structure rejects malformed quoting and invalid headers', () => {
  for (const csv of ['Nome;Cognome\n"Anna"oops;Verdi', 'Nome;Nome;Cognome\nAnna;Anna;Verdi', 'Nome;Cognome;Unknown\nAnna;Verdi;x', 'Nome;Cognome\n"Anna;Verdi', 'Nome;Cognome\nAnna;Verdi;x', '<html>not csv</html>']) {
    assert.throws(() => parseCsv(csv));
  }

  assert.deepEqual(parseCsv('Nome;Cognome'), []);
  assert.equal(parseCsv(contactsToCsv(demoContacts))[0].phone, demoContacts[0].phone);
});
