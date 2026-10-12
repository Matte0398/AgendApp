import "./styles.css";
import {
  STORAGE_KEY,
  demoContacts,
  emptyContact,
  filterContacts,
  isContactList,
  contactsToCsv,
  parseCsv,
  duplicateOf,
  planImport,
  validateContact,
  applyImport,
} from "./contacts.js";
import { translations, fieldLabels } from "./translations.js";

const app = document.getElementById("app");
const THEME_KEY = "agenda.theme.v1";
const LANGUAGE_KEY = "agenda.language.v1";
const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const state = {
  theme: safeGet(THEME_KEY) === "light" ? "light" : "dark",
  language: safeGet(LANGUAGE_KEY) === "it" ? "it" : "en",
  contacts: [],
  query: "",
  country: "",
  sort: "name",
  view: "all",
  dialog: null,
  storageError: "",
  toast: "",
};

try {
  const value = safeGet(STORAGE_KEY);
  const parsed =
    value === null
      ? demoContacts.map((contact) => ({ ...contact }))
      : JSON.parse(value);

  if (!isContactList(parsed)) throw new Error("Invalid saved contacts");

  state.contacts = parsed;
} catch {
  state.storageError =
    "Saved contacts could not be read. Existing data was not overwritten.";
}

const t = (key) => translations[state.language][key] || key;
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const icons = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>
<g id="i-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></g>
<g id="i-book"><rect x="5" y="3" width="15" height="18" rx="2"/><circle cx="12.5" cy="9" r="2"/><path d="M8.5 17c0-4 8-4 8 0M2 8h5M2 16h5"/></g>
<g id="i-star"><path d="m12 2 3.1 6.3 7 1-5 4.9 1.2 6.9L12 17.8l-6.3 3.3 1.2-6.9-5-4.9 7-1z"/></g>
<g id="i-plus"><path d="M12 5v14M5 12h14"/></g><g id="i-search"><circle cx="10.8" cy="10.8" r="7.3"/><path d="m16 16 5 5"/></g>
<g id="i-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></g>
<g id="i-moon"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></g>
<g id="i-globe"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></g>
<g id="i-download"><path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/></g><g id="i-upload"><path d="M12 17V4m-5 5 5-5 5 5M4 17v4h16v-4"/></g>
<g id="i-pencil"><path d="m4 20 4.2-.9L20 7.2 16.8 4 5 15.8 4 20ZM14.5 6.5l3 3"/></g>
<g id="i-trash"><path d="M3 6h18M8 6V4h8v2m-11 0 1 15h12l1-15M10 10v7m4-7v7"/></g><g id="i-x"><path d="M5 5 19 19M19 5 5 19"/></g>
<g id="i-check"><path d="m4 12 5 5L20 6"/></g><g id="i-map"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></g>
</defs></svg>`;
const button = (action, label, kind = "secondary", extra = "") =>
  `<button type="button" class="btn ${kind}" data-action="${action}" ${extra}>${label}</button>`;
const alertText = (text, kind = "toast") => {
  state.toast = text;
  render();
  if (kind === "toast")
    setTimeout(() => {
      if (state.toast === text) {
        state.toast = "";
        render();
      }
    }, 3500);
};

function commit(contacts, message = "") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    state.storageError = "";
  } catch {
    state.storageError = t("storageFail");
  }
  state.contacts = contacts;

  if (
    state.country &&
    !contacts.some((contact) => contact.country === state.country)
  )
    state.country = "";

  state.dialog = null;

  if (message) state.toast = message;

  render();
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.language;
  document.title = `AgendApp · ${t("directory")}`;
  const contacts = filterContacts(state.contacts, {
    query: state.query,
    country: state.country,
    view: state.view,
    sort: state.sort,
    language: state.language,
  });
  const countryNames = [
    ...new Set(
      state.contacts.map((contact) => contact.country).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, state.language));
  const favorites = state.contacts.filter((contact) => contact.favorite).length;
  app.innerHTML = `${icons}<div class="shell"><aside class="sidebar"><div class="brand"><span class="brand-icon">${icon("book", 26)}</span>agenda<span class="accent">.</span></div><p class="overline">${t("space")}</p><nav class="nav"><button class="nav-item ${state.view === "all" ? "active" : ""}" data-action="view-all">${icon("users")}<span>${t("all")}</span><b>${state.contacts.length}</b></button><button class="nav-item ${state.view === "favorites" ? "active" : ""}" data-action="view-favorites">${icon("star")}<span>${t("favorites")}</span><b>${favorites}</b></button></nav><section class="sidebar-card"><span class="sidebar-illustration">${icon("book", 24)}</span><h3>${t("personal")}</h3><p>${t("sidebarDescription")}</p>${button("new", icon("plus", 16) + " " + t("add"), "link")}</section><div class="sidebar-bottom">${button("help", t("help"), "link")}<div class="profile">A <span>${t("personal")}</span></div></div></aside>
  <div class="page"><header class="topbar"><span class="breadcrumb">${icon("book", 17)} ${t("personal")} <strong>/ ${t("directory")}</strong></span><div class="settings"><button class="icon-btn" data-action="theme" aria-label="${t("tooltipTheme")}" title="${state.theme === "dark" ? t("light") : t("dark")}">${icon(state.theme === "dark" ? "sun" : "moon")}</button><button class="language-btn" data-action="language" aria-label="${t("tooltipLang")}">${icon("globe", 16)} ${state.language.toUpperCase()} <span>⌄</span></button></div></header>
  <main><div class="hero"><div><span class="eyebrow">${t("space")}</span><h1>${t("title")}<span class="accent">.</span></h1><p>${t("intro")}</p></div>${button("new", icon("plus") + " " + t("add"), "primary")}</div>
  ${state.storageError ? `<div class="warning" role="alert">${escapeHtml(state.storageError)}</div>` : ""}
  <div class="stats"><article class="stat"><div><p>${t("contacts")}</p><strong>${String(state.contacts.length).padStart(2, "0")}</strong></div><span class="stat-icon orange">${icon("users", 23)}</span></article><article class="stat"><div><p>${t("favoriteCount")}</p><strong>${String(favorites).padStart(2, "0")}</strong></div><span class="stat-icon amber">${icon("star", 23)}</span></article><article class="stat"><div><p>${t("countries")}</p><strong>${String(countryNames.length).padStart(2, "0")}</strong></div><span class="stat-icon green">${icon("globe", 23)}</span></article></div>
  <section class="panel"><div class="panel-header"><div class="panel-title"><h2>${state.view === "favorites" ? t("favoriteDirectory") : t("directory")}</h2><span class="counter">${contacts.length}</span></div><div class="actions">${button("import", icon("upload", 16) + " " + t("import"))}${button("export", icon("download", 16) + " " + t("export"), "secondary", contacts.length ? "" : "disabled")}</div></div>
  <div class="filters"><label class="search">${icon("search")}<input id="search" type="search" placeholder="${t("search")}" aria-label="${t("search")}" value="${escapeHtml(state.query)}"/><kbd>Ctrl K</kbd></label><select id="country" aria-label="${t("allCountries")}"><option value="">${t("allCountries")}</option>${countryNames.map((country) => `<option ${state.country === country ? "selected" : ""} value="${escapeHtml(country)}">${escapeHtml(country)}</option>`).join("")}</select><select id="sort" aria-label="Sort"><option value="name" ${state.sort === "name" ? "selected" : ""}>${t("sortName")}</option><option value="city" ${state.sort === "city" ? "selected" : ""}>${t("sortCity")}</option></select></div>
  <div class="table-scroll"><table><thead><tr><th>☆</th><th>${t("name")}</th><th>${t("details")}</th><th>${t("location")}</th><th>${t("notes")}</th><th>${t("actions")}</th></tr></thead><tbody>${contacts.map((contact) => `<tr><td><button class="row-icon ${contact.favorite ? "favorited" : ""}" data-action="favorite" data-id="${escapeHtml(contact.id)}" aria-label="${contact.favorite ? t("removeFavorite") : t("addFavorite")}">${icon("star")}</button></td><td><button class="contact-name" data-action="detail" data-id="${escapeHtml(contact.id)}"><span class="avatar">${escapeHtml((contact.firstName[0] || "") + (contact.lastName[0] || ""))}</span><span><strong>${escapeHtml(contact.firstName)} ${escapeHtml(contact.lastName)}</strong><small>${t("contact")}</small></span></button></td><td><div class="contact-info">${contact.email ? `<a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>` : `<span>${t("noEmail")}</span>`}${contact.phone ? `<a href="tel:${escapeHtml(contact.phone.replace(/[^+\d]/g, ""))}">${escapeHtml(contact.phone)}</a>` : ""}</div></td><td><strong class="city">${escapeHtml(contact.city || t("noCity"))}</strong><small>${escapeHtml([contact.region, contact.country].filter(Boolean).join(", "))}</small></td><td><span class="note-preview" title="${escapeHtml(contact.notes)}">${escapeHtml(contact.notes || t("noNotes"))}</span></td><td class="row-actions"><button class="row-icon" data-action="edit" data-id="${escapeHtml(contact.id)}" aria-label="${t("edit")}">${icon("pencil", 16)}</button><button class="row-icon danger-text" data-action="delete" data-id="${escapeHtml(contact.id)}" aria-label="${t("delete")}">${icon("trash", 16)}</button><button class="row-icon" data-action="detail" data-id="${escapeHtml(contact.id)}" aria-label="${t("open")}">•••</button></td></tr>`).join("")}</tbody></table></div>
  ${!contacts.length ? `<div class="empty">${icon("search", 34)}<h3>${state.query || state.country ? t("noResults") : t("empty")}</h3><p>${state.query || state.country ? t("noResultsHint") : t("emptyHint")}</p>${state.query || state.country ? button("clear", t("clear")) : button("new", t("add"), "primary")}</div>` : ""}
  <div class="panel-footer"><span><strong>${contacts.length}</strong> ${t("shown")}</span><span>● ${t("stored")}</span></div></section>
  <footer>${t("footer")}</footer></main></div></div><input id="csv-file" type="file" accept=".csv,text/csv" hidden />
  ${state.dialog ? dialogMarkup() : ""}${state.toast ? `<div class="toast" role="status">${icon("check", 18)} ${escapeHtml(state.toast)}</div>` : ""}`;

  if (state.dialog) {
    const dialog = app.querySelector("dialog");
    dialog.showModal();
  }
}

function dialogMarkup() {
  const dialog = state.dialog;
  const contact = dialog.contact;
  const heading =
    dialog.type === "form"
      ? contact?.id
        ? t("editTitle")
        : t("newTitle")
      : dialog.type === "delete"
        ? t("confirmDelete")
        : dialog.type === "detail"
          ? t("detailTitle")
          : dialog.type === "import"
            ? t("importTitle")
            : dialog.type === "import-result"
              ? t("imported")
            : dialog.type === "duplicate"
              ? t("duplicateTitle")
              : t("help");
  let content = "";

  if (dialog.type === "form") {
    const current = contact || emptyContact;
    const formFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "country",
      "region",
      "city",
      "postalCode",
      "address",
      "streetNumber",
    ];
    content = `<form id="contact-form" novalidate>${dialog.errors ? `<div class="warning" role="alert"><ul>${Object.entries(dialog.errors).map(([key, reason]) => `<li>${escapeHtml(fieldLabels[key][state.language === "en" ? 1 : 0])}: ${escapeHtml(t(reason))}</li>`).join("")}</ul></div>` : ""}<p class="hint">${t("required")}</p><div class="form-grid">${formFields.map((key) => `<label>${fieldLabels[key][state.language === "en" ? 1 : 0]}${["firstName", "lastName"].includes(key) ? " *" : ""}<input name="${key}" type="${key === "email" ? "email" : key === "phone" ? "tel" : "text"}" maxlength="254" ${["firstName", "lastName"].includes(key) ? "required" : ""} value="${escapeHtml(current[key])}"/></label>`).join("")}<label class="wide">${fieldLabels.notes[state.language === "en" ? 1 : 0]}<textarea name="notes" rows="3" maxlength="2000">${escapeHtml(current.notes)}</textarea></label><label class="wide check-label"><input name="favorite" type="checkbox" ${current.favorite ? "checked" : ""}/> ${t("addFavorite")}</label></div><div class="modal-footer"><button type="button" class="btn secondary" data-action="close">${t("cancel")}</button><button type="submit" class="btn primary">${contact?.id ? t("save") : t("create")}</button></div></form>`;
  } else if (dialog.type === "detail") {
    content = `<div class="detail"><div class="detail-name"><span class="avatar large">${escapeHtml(contact.firstName[0] + contact.lastName[0])}</span><h3>${escapeHtml(contact.firstName)} ${escapeHtml(contact.lastName)}</h3><p>${escapeHtml([contact.city, contact.country].filter(Boolean).join(", "))}</p></div><dl>${["email", "phone", "address", "streetNumber", "postalCode", "city", "region", "country", "notes"].map((key) => `<div><dt>${fieldLabels[key][state.language === "en" ? 1 : 0]}</dt><dd>${escapeHtml(contact[key]) || "—"}</dd></div>`).join("")}</dl></div><div class="modal-footer">${button("close", t("close"))}${button("edit", t("edit"), "primary", `data-id="${escapeHtml(contact.id)}"`)}</div>`;
  } else if (dialog.type === "delete") {
    content = `<p class="modal-copy"><b>${escapeHtml(contact.firstName)} ${escapeHtml(contact.lastName)}</b><br>${t("confirmDeleteText")}</p><div class="modal-footer">${button("close", t("cancel"))}${button("delete-confirm", t("delete"), "danger")}</div>`;
  } else if (dialog.type === "duplicate") {
    content = `<p class="modal-copy">${t("duplicateText")}<br><strong>${escapeHtml(dialog.match.firstName)} ${escapeHtml(dialog.match.lastName)}</strong></p><div class="modal-footer">${button("close", t("cancel"))}${button("save-duplicate", t("saveAnyway"), "primary")}</div>`;
  } else if (dialog.type === "import") {
    const plan = dialog.plan;
    const skippedRows = [
      ...plan.duplicates.map((item) => ({ ...item, reason: item.canUpdate ? t("duplicateUpdatable") : t("duplicateSkipped") })),
      ...plan.invalid.map((item) => ({ ...item, reason: Object.entries(item.errors).map(([key, reason]) => fieldLabels[key][state.language === "en" ? 1 : 0] + ": " + t(reason)).join("; ") })),
    ].sort((left, right) => left.row - right.row);
    content = `<div class="modal-copy"><p><strong>${t("importReady")}:</strong> ${plan.accepted.length}</p><p><strong>${t("importDuplicates")}:</strong> ${plan.duplicates.length}</p><p><strong>${t("invalidRows")}:</strong> ${plan.invalid.length}</p>${skippedRows.length ? `<details><summary>${t("skippedDetails")}</summary><ul>${skippedRows.map((item) => `<li>${t("row")} ${item.row}: ${escapeHtml(item.contact.firstName)} ${escapeHtml(item.contact.lastName)} — ${escapeHtml(item.reason)}</li>`).join("")}</ul></details>` : ""}${plan.updates.length ? `<label class="check-label"><input id="update-duplicates" type="checkbox"/> ${t("updateDuplicates")} (${plan.updates.length})</label><p>${t("updateWarning")}</p>` : ""}${!plan.accepted.length ? `<p>${t("importNone")}</p>` : ""}</div><div class="modal-footer">${button("close", t("cancel"))}${button("import-confirm", t("importConfirm"), "primary")}</div>`;
  } else if (dialog.type === "import-result") {
    const outcome = dialog.outcome;
    content = `<div class="modal-copy" role="status">${!outcome.imported && !outcome.updated ? `<p>${t("importNone")}</p>` : ""}<p>${t("importedCount")}: ${outcome.imported}</p><p>${t("updatedCount")}: ${outcome.updated}</p><p>${t("skippedCount")}: ${outcome.skipped}</p><p>${t("invalidRows")}: ${outcome.invalid}</p></div><div class="modal-footer">${button("close", t("close"), "primary")}</div>`;
  } else
    content = `<p class="modal-copy">${t("helpText")}</p><div class="modal-footer">${button("close", t("close"), "primary")}</div>`;

  return `<dialog class="modal" aria-labelledby="dialog-title"><div class="modal-heading"><h2 id="dialog-title">${heading}</h2><button class="icon-btn" data-action="close" aria-label="${t("close")}">${icon("x")}</button></div>${content}</dialog>`;
}

function handleSave(contact, skipDuplicate = false) {
  const errors = validateContact(contact);
  if (Object.keys(errors).length) {
    state.dialog = { type: "form", contact, errors };
    render();
    app.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus();
    return;
  }

  contact.id ||= crypto.randomUUID();
  if (!skipDuplicate) {
    const match = duplicateOf(contact, state.contacts);

    if (match) {
      state.dialog = { type: "duplicate", contact, match };
      render();
      return;
    }
  }

  const exists = state.contacts.some((item) => item.id === contact.id);
  commit(
    exists
      ? state.contacts.map((item) => (item.id === contact.id ? contact : item))
      : [...state.contacts, contact],
    t("savedToast"),
  );
}

app.addEventListener("submit", (event) => {
  if (event.target.id !== "contact-form") return;

  event.preventDefault();
  const values = new FormData(event.target);
  const contact = { ...emptyContact };
  Object.keys(emptyContact).forEach((key) => {
    if (key !== "favorite") contact[key] = String(values.get(key) || "").trim();
  });
  contact.favorite = values.get("favorite") === "on";

  const original = state.dialog.contact;
  contact.id = original?.id;
  handleSave(contact);
});

app.addEventListener("click", (event) => {
  const element = event.target.closest("[data-action]");

  if (!element) return;

  const action = element.dataset.action;
  const contact = state.contacts.find((item) => item.id === element.dataset.id);

  if (action === "theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, state.theme);
    } catch {}
  } else if (action === "language") {
    state.language = state.language === "it" ? "en" : "it";
    try {
      localStorage.setItem(LANGUAGE_KEY, state.language);
    } catch {}
  } else if (action === "view-all" || action === "view-favorites") {
    state.view = action === "view-all" ? "all" : "favorites";
    state.query = "";
    state.country = "";
  } else if (action === "new") state.dialog = { type: "form" };
  else if (action === "edit" && (contact || state.dialog?.contact))
    state.dialog = { type: "form", contact: contact || state.dialog.contact };
  else if (action === "delete" && contact)
    state.dialog = { type: "delete", contact };
  else if (action === "detail" && contact)
    state.dialog = { type: "detail", contact };
  else if (action === "favorite" && contact) {
    commit(
      state.contacts.map((item) =>
        item.id === contact.id ? { ...item, favorite: !item.favorite } : item,
      ),
    );
    return;
  } else if (action === "close") state.dialog = null;
  else if (action === "help") state.dialog = { type: "help" };
  else if (action === "delete-confirm") {
    commit(
      state.contacts.filter((item) => item.id !== state.dialog.contact.id),
      t("deletedToast"),
    );
    return;
  } else if (action === "save-duplicate") {
    handleSave(state.dialog.contact, true);
    return;
  } else if (action === "import") {
    app.querySelector("#csv-file").click();
    return;
  } else if (action === "import-confirm") {
    const shouldUpdate = app.querySelector("#update-duplicates")?.checked || false;
    const outcome = applyImport(state.dialog.incoming, state.contacts, shouldUpdate);
    if (outcome.imported || outcome.updated) commit(outcome.contacts);

    state.dialog = { type: "import-result", outcome };
    render();
    return;
  } else if (action === "clear") {
    state.query = "";
    state.country = "";
  } else if (action === "export") {
    const contacts = filterContacts(state.contacts, {
      query: state.query,
      country: state.country,
      view: state.view,
      sort: state.sort,
      language: state.language,
    });
    const url = URL.createObjectURL(
      new Blob([contactsToCsv(contacts, state.language)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `agenda-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return;
  }

  render();
});

app.addEventListener("input", (event) => {
  if (event.target.id === "search") {
    state.query = event.target.value;
    const cursor = event.target.selectionStart;
    render();
    const input = app.querySelector("#search");
    input.focus();
    input.setSelectionRange(cursor, cursor);
  }
});

app.addEventListener("change", async (event) => {
  if (event.target.id === "country") {
    state.country = event.target.value;
    render();
  }
  if (event.target.id === "sort") {
    state.sort = event.target.value;
    render();
  }
  if (event.target.id === "csv-file") {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      alertText(t("csvFileType"), "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alertText(t("csvErr"));
      return;
    }

    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const incoming = parseCsv(text);
      state.dialog = {
        type: "import",
        incoming,
        plan: planImport(incoming, state.contacts),
      };
      render();
    } catch {
      alertText(t("invalidCsv"));
    }
  }
});

app.addEventListener("cancel", (event) => {
  if (event.target.matches("dialog")) {
    event.preventDefault();
    state.dialog = null;
    render();
  }
});
document.addEventListener("keydown", (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "k" &&
    !state.dialog
  ) {
    event.preventDefault();
    app.querySelector("#search")?.focus();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    try {
      const data = event.newValue === null ? [] : JSON.parse(event.newValue);

      if (!isContactList(data)) throw new Error();

      state.contacts = data;
      state.dialog = null;
      state.toast = t("storageSynced");
      render();
    } catch {
      state.storageError = t("storageFail");
      render();
    }
  } else if (event.key === THEME_KEY) {
    state.theme = event.newValue === "light" ? "light" : "dark";
    render();
  } else if (event.key === LANGUAGE_KEY) {
    state.language = event.newValue === "it" ? "it" : "en";
    render();
  }
});

render();
