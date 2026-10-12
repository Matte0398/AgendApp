export const STORAGE_KEY = "agenda.contacts.v1";
export const fields = [
  "lastName",
  "firstName",
  "country",
  "region",
  "city",
  "address",
  "streetNumber",
  "postalCode",
  "phone",
  "email",
  "notes",
];
export const emptyContact = {
  firstName: "",
  lastName: "",
  country: "Italia",
  region: "",
  city: "",
  address: "",
  streetNumber: "",
  postalCode: "",
  phone: "",
  email: "",
  notes: "",
  favorite: false,
};
export const demoContacts = [
  {
    id: "demo-1",
    firstName: "Gerd",
    lastName: "Müller",
    country: "Germania",
    region: "Brandeburgo",
    city: "Berlino",
    address: "Piazza Berlino",
    streetNumber: "19",
    postalCode: "10115",
    phone: "+49 30 0000001",
    email: "gerd.muller@example.com",
    notes: "Contatto dimostrativo dell’agenda.",
    favorite: true,
  },
  {
    id: "demo-2",
    firstName: "Ciccio",
    lastName: "Pasticcio",
    country: "Italia",
    region: "Marche",
    city: "Ancona",
    address: "Via Cavour",
    streetNumber: "62",
    postalCode: "60121",
    phone: "+39 071 0000002",
    email: "ciccio.pasticcio@example.com",
    notes: "Contatto dimostrativo dell’agenda.",
    favorite: false,
  },
  {
    id: "demo-3",
    firstName: "Valentino",
    lastName: "Rossi",
    country: "Italia",
    region: "Marche",
    city: "Ancona",
    address: "Piazza del Plebiscito",
    streetNumber: "3",
    postalCode: "60121",
    phone: "+39 071 0000003",
    email: "valentino.rossi@example.com",
    notes: "Contatto dimostrativo dell’agenda.",
    favorite: true,
  },
];

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function filterContacts(
  contacts,
  {
    query = "",
    country = "",
    view = "all",
    sort = "name",
    language = "it",
  } = {},
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return contacts
    .filter((contact) => {
      const content = normalize(fields.map((key) => contact[key]).join(" "));
      return (
        (view !== "favorites" || contact.favorite) &&
        (!country || contact.country === country) &&
        terms.every((term) => content.includes(term))
      );
    })
    .sort((a, b) => {
      const left = sort === "city" ? a.city : a.lastName;
      const right = sort === "city" ? b.city : b.lastName;
      return (
        left.localeCompare(right, language) ||
        a.firstName.localeCompare(b.firstName, language)
      );
    });
}

export function isContactList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (contact) =>
        contact &&
        typeof contact.id === "string" &&
        Object.keys(emptyContact).every(
          (key) => typeof contact[key] === typeof emptyContact[key],
        ),
    ) &&
    new Set(value.map((contact) => contact.id)).size === value.length
  );
}

const headings = {
  it: {
    lastName: "Cognome",
    firstName: "Nome",
    country: "Nazione",
    region: "Regione",
    city: "Città",
    address: "Indirizzo",
    streetNumber: "N° civico",
    postalCode: "CAP",
    phone: "Telefono",
    email: "Email",
    notes: "Note",
  },
  en: {
    lastName: "Last name",
    firstName: "First name",
    country: "Country",
    region: "Region",
    city: "City",
    address: "Address",
    streetNumber: "Street number",
    postalCode: "Postal code",
    phone: "Phone",
    email: "Email",
    notes: "Notes",
  },
};

export function contactsToCsv(contacts, language = "it") {
  const escape = (value) => {
    let text = String(value ?? "");
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      fields.map((key) => headings[language]?.[key] || headings.it[key]),
      ...contacts.map((contact) => fields.map((key) => contact[key])),
    ]
      .map((row) => row.map(escape).join(";"))
      .join("\r\n")
  );
}

export function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, "");
  const delimiter =
    (source.split(/\r?\n/, 1)[0].match(/;/g) || []).length >=
    (source.split(/\r?\n/, 1)[0].match(/,/g) || []).length
      ? ";"
      : ",";
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  let hasClosedQuote = false;

  for (let i = 0; i < source.length; i++) {
    const character = source[i];

    if (character === '"') {
      if (quoted && source[i + 1] === '"') {
        value += '"';
        i++;
      } else if (quoted) {
        quoted = false;
        hasClosedQuote = true;
      } else if (value === "" && !hasClosedQuote) quoted = true;
      else throw new Error("Malformed CSV");
    } else if (character === delimiter && !quoted) {
      row.push(value);
      value = "";
      hasClosedQuote = false;
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[i + 1] === "\n") i++;

      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
      hasClosedQuote = false;
    } else {
      if (hasClosedQuote) throw new Error("Unexpected text after closing quote");

      value += character;
    }

  }

  if (quoted) throw new Error("Unclosed CSV quote");

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);

  if (!rows.length) throw new Error("Empty CSV");

  const positions = rows[0].map((name) =>
    fields.find(
      (key) =>
        normalize(headings.it[key]) === normalize(name) ||
        normalize(headings.en[key]) === normalize(name),
    ),
  );

  if (!positions.includes("firstName") || !positions.includes("lastName"))
    throw new Error("Missing name columns");

  if (positions.some((key) => !key) || new Set(positions).size !== positions.length) {
    throw new Error("Unknown or duplicate columns");
  }

  const contacts = rows.slice(1).map((values, index) => {
    if (values.length !== positions.length)
      throw new Error(`Invalid column count on row ${index + 2}`);
    const contact = { ...emptyContact, country: "" };
    positions.forEach((key, column) => {
      if (key) contact[key] = values[column].replace(/^'(?=[=+@-])/, "").trim();
    });

    return contact;
  });

  return contacts;
}

export function duplicateOf(contact, contacts) {
  const email = normalize(contact.email);
  const phone = String(contact.phone || "").replace(/\D/g, "");
  return contacts.find(
    (other) =>
      (!contact.id || other.id !== contact.id) &&
      ((email && normalize(other.email) === email) ||
        (phone &&
          phone.length >= 6 &&
          String(other.phone || "").replace(/\D/g, "") === phone) ||
        (normalize(other.firstName) === normalize(contact.firstName) &&
          normalize(other.lastName) === normalize(contact.lastName))),
  );
}

export function validateContact(contact) {
  const errors = {};
  for (const key of ["firstName", "lastName"]) {
    if (!String(contact[key] || "").trim()) errors[key] = "missingField";
  }

  for (const key of fields) {
    if (String(contact[key] || "").length > (key === "notes" ? 2000 : 254)) {
      errors[key] = "tooLong";
    }

  }

  const email = String(contact.email || "").trim();
  if (email && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(email)) {
    errors.email = "invalidEmail";
  }

  const phone = String(contact.phone || "").trim();
  const digitCount = phone.replace(/\D/g, "").length;
  if (phone && (!/^\+?[0-9 ()-]+$/.test(phone) || digitCount < 10 || digitCount > 15)) {
    errors.phone = "invalidPhone";
  }

  return errors;
}


export function planImport(incoming, existing) {
  const accepted = [],
    duplicates = [];
  const invalid = [];
  const updates = [];

  for (const [index, contact] of incoming.entries()) {
    const errors = validateContact(contact);
    const row = index + 2;
    if (Object.keys(errors).length) {
      invalid.push({ contact, row, errors });
      continue;
    }

    const matches = existing.filter((existingContact) => duplicateOf(contact, [existingContact]));
    const match = matches[0] || duplicateOf(contact, accepted);

    if (match) {
      const canUpdate = matches.length === 1 && !updates.some((item) => item.match.id === match.id);
      const duplicate = { contact, match, row, canUpdate };
      duplicates.push(duplicate);
      if (canUpdate) updates.push(duplicate);
    } else {
      accepted.push(contact);
    }

  }

  return { accepted, duplicates, invalid, updates };
}


export function applyImport(incoming, existing, shouldUpdate = false) {
  const plan = planImport(incoming, existing);
  const updates = shouldUpdate ? plan.updates : [];
  const contacts = existing.map((contact) => {
    const update = updates.find((item) => item.match.id === contact.id);
    return update ? { ...contact, ...update.contact, id: contact.id, favorite: contact.favorite } : contact;
  });
  contacts.push(...plan.accepted.map((contact) => ({ ...contact, id: crypto.randomUUID() })));

  return { contacts, imported: plan.accepted.length, updated: updates.length, skipped: plan.duplicates.length - updates.length, invalid: plan.invalid.length };
}
