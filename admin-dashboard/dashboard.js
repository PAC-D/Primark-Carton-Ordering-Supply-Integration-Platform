(() => {
  "use strict";
  const config = window.SUPABASE_CONFIG || {};
  const publishableKey = config.publishableKey || config.anonKey;
  const tokenKey = "cartonconnect_admin_token";
  const token = localStorage.getItem(tokenKey);
  const suppliers = Array.isArray(window.SUPPLIER_FACTORY_DATA) ? window.SUPPLIER_FACTORY_DATA : [];
  const shell = document.querySelector("#dashboard-shell");
  const authCheck = document.querySelector("#auth-check");
  const tableBody = document.querySelector("#registrations-body");
  const tableMessage = document.querySelector("#table-message");
  const refreshButton = document.querySelector("#refresh-button");
  const searchInput = document.querySelector("#search-input");
  const editDialog = document.querySelector("#edit-dialog");
  const deleteDialog = document.querySelector("#delete-dialog");
  const settingsDialog = document.querySelector("#settings-dialog");
  const editSupplierInput = document.querySelector("#edit-supplier-search");
  const editSupplierPanel = document.querySelector("#edit-supplier-options");
  const editFactoryInput = document.querySelector("#edit-factory-search");
  const editFactoryPanel = document.querySelector("#edit-factory-options");
  const editFactoryControl = document.querySelector("#edit-factory-multiselect");
  const editFactoryChips = document.querySelector("#edit-selected-factories");
  const editFactoryCount = document.querySelector("#edit-factory-count");
  let registrations = [];
  let deleteTarget = null;
  let editSupplier = null;
  const editFactories = new Map();

  async function callRpc(name, payload) {
    if (!config.url || !publishableKey) throw new Error("Supabase is not configured.");
    const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let message = "The request could not be completed.";
      try { message = (await response.json()).message || message; } catch (_) { /* non-JSON response */ }
      throw new Error(message);
    }
    return response.json();
  }

  function returnToLogin(reason = "") {
    localStorage.removeItem(tokenKey);
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    window.location.replace(`../admin/${query}`);
  }

  const formatDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const factoryNames = (factories) => Array.isArray(factories) && factories.length
    ? factories.map((factory) => factory.name || factory.code).filter(Boolean).join(", ")
    : "—";

  function appendCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (className) cell.className = className;
    row.append(cell);
    return cell;
  }

  function filteredRegistrations() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    if (!query) return registrations;
    return registrations.filter((item) => `${item.registration_type} ${item.full_name} ${item.email} ${item.supplier_name} ${factoryNames(item.factories)}`.toLocaleLowerCase().includes(query));
  }

  function render() {
    const visible = filteredRegistrations();
    tableBody.replaceChildren();
    document.querySelector("#total-count").textContent = registrations.length;
    document.querySelector("#supplier-count").textContent = registrations.filter((item) => item.registration_type === "Supplier").length;
    document.querySelector("#factory-registration-count").textContent = registrations.filter((item) => item.registration_type === "Factory").length;
    document.querySelector("#packaging-count").textContent = registrations.filter((item) => item.registration_type === "Packaging supplier").length;

    visible.forEach((registration) => {
      const row = document.createElement("tr");
      const typeCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "type-badge";
      badge.textContent = registration.registration_type;
      typeCell.append(badge);
      row.append(typeCell);
      appendCell(row, registration.full_name);
      appendCell(row, registration.email);
      appendCell(row, registration.supplier_name);
      appendCell(row, factoryNames(registration.factories), "factory-list muted-cell");
      appendCell(row, formatDate(registration.registered_at), "muted-cell");
      const actionCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "row-actions";
      [["Edit", "edit"], ["Delete", "delete"]].forEach(([label, action]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `action-button ${action}`;
        button.dataset.action = action;
        button.dataset.type = registration.registration_type;
        button.dataset.id = registration.record_id;
        button.textContent = label;
        actions.append(button);
      });
      actionCell.append(actions);
      row.append(actionCell);
      tableBody.append(row);
    });
    tableMessage.hidden = Boolean(visible.length);
    tableMessage.textContent = registrations.length ? "No registrations match your search." : "No registrations found.";
  }

  async function loadRegistrations() {
    refreshButton.disabled = true;
    tableMessage.hidden = false;
    tableMessage.textContent = "Loading registrations...";
    try {
      registrations = await callRpc("get_admin_registrations", { p_token: token });
      render();
    } catch (error) {
      if (/unauthorized|session/i.test(error.message)) returnToLogin("session");
      tableMessage.textContent = error.message;
    } finally {
      refreshButton.disabled = false;
    }
  }

  const normalise = (value) => String(value || "").toLocaleLowerCase().trim();
  const matchesQuery = (item, query) => normalise(`${item.name} ${item.code}`).includes(normalise(query));

  function setEditPanel(input, panel, open) {
    panel.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
  }

  function renderEditSuppliers(query = "") {
    editSupplierPanel.replaceChildren();
    const matches = suppliers.filter((supplier) => matchesQuery(supplier, query));
    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "empty-option";
      empty.textContent = "No suppliers found";
      editSupplierPanel.append(empty);
      return;
    }
    matches.forEach((supplier) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.role = "option";
      button.setAttribute("aria-selected", String(editSupplier?.code === supplier.code));
      const text = document.createElement("span");
      text.textContent = supplier.name;
      const code = document.createElement("small");
      code.textContent = `Supplier code: ${supplier.code}`;
      text.append(code);
      button.append(text);
      button.addEventListener("click", () => selectEditSupplier(supplier));
      editSupplierPanel.append(button);
    });
  }

  function selectEditSupplier(supplier, keepFactories = false) {
    const changed = editSupplier?.code !== supplier.code;
    editSupplier = supplier;
    editSupplierInput.value = supplier.name;
    if (changed && !keepFactories) editFactories.clear();
    editFactoryInput.value = "";
    editFactoryInput.disabled = false;
    editFactoryInput.placeholder = "Search and select factories";
    editFactoryControl.classList.remove("is-disabled");
    setEditPanel(editSupplierInput, editSupplierPanel, false);
    renderEditFactories();
    renderEditFactoryChips();
  }

  function clearEditSupplierSelection() {
    editSupplier = null;
    editFactories.clear();
    editFactoryInput.value = "";
    editFactoryInput.disabled = true;
    editFactoryInput.placeholder = "Select a supplier first";
    editFactoryControl.classList.add("is-disabled");
    setEditPanel(editFactoryInput, editFactoryPanel, false);
    renderEditFactoryChips();
  }

  function renderEditFactories(query = "") {
    editFactoryPanel.replaceChildren();
    if (!editSupplier) return;
    const list = document.createElement("div");
    list.className = "options-list";
    list.role = "listbox";
    list.setAttribute("aria-multiselectable", "true");
    const matches = editSupplier.factories.filter((factory) => matchesQuery(factory, query));
    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "empty-option";
      empty.textContent = "No assigned factories found";
      list.append(empty);
    }
    matches.forEach((factory) => {
      const selected = editFactories.has(factory.code);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.role = "option";
      button.setAttribute("aria-selected", String(selected));
      const check = document.createElement("span");
      check.className = "option-check";
      check.textContent = selected ? "✓" : "";
      const text = document.createElement("span");
      text.textContent = factory.name;
      const code = document.createElement("small");
      code.textContent = `Factory code: ${factory.code}`;
      text.append(code);
      button.append(check, text);
      button.addEventListener("click", () => toggleEditFactory(factory));
      list.append(button);
    });
    const actions = document.createElement("div");
    actions.className = "options-actions";
    const summary = document.createElement("span");
    summary.textContent = `${editFactories.size} ${editFactories.size === 1 ? "factory" : "factories"} selected`;
    const done = document.createElement("button");
    done.type = "button";
    done.className = "done-button";
    done.textContent = "Done";
    done.addEventListener("click", () => setEditPanel(editFactoryInput, editFactoryPanel, false));
    actions.append(summary, done);
    editFactoryPanel.append(list, actions);
  }

  function toggleEditFactory(factory) {
    if (editFactories.has(factory.code)) editFactories.delete(factory.code);
    else editFactories.set(factory.code, factory);
    renderEditFactories(editFactoryInput.value);
    renderEditFactoryChips();
  }

  function renderEditFactoryChips() {
    editFactoryChips.replaceChildren();
    editFactoryCount.textContent = editFactories.size ? `${editFactories.size} selected` : "";
    editFactories.forEach((factory) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      const name = document.createElement("span");
      name.textContent = factory.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${factory.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => toggleEditFactory(factory));
      chip.append(name, remove);
      editFactoryChips.append(chip);
    });
  }

  function openEdit(registration) {
    document.querySelector("#edit-id").value = registration.record_id;
    document.querySelector("#edit-type").value = registration.registration_type;
    document.querySelector("#edit-name").value = registration.full_name;
    document.querySelector("#edit-email").value = registration.email;
    document.querySelector("#edit-status").textContent = "";
    const hasSupplierAndFactory = registration.registration_type === "Supplier" || registration.registration_type === "Factory";
    document.querySelector("#supplier-edit-fields").hidden = !hasSupplierAndFactory;
    document.querySelector("#packaging-edit-fields").hidden = hasSupplierAndFactory;

    if (hasSupplierAndFactory) {
      const supplier = suppliers.find((item) => item.code === registration.supplier_code);
      editFactories.clear();
      (registration.factories || []).forEach((factory) => editFactories.set(factory.code, factory));
      if (supplier) selectEditSupplier(supplier, true);
      else {
        editSupplierInput.value = registration.supplier_name;
        clearEditSupplierSelection();
      }
    } else {
      document.querySelector("#edit-packaging-supplier").value = registration.supplier_name;
    }
    editDialog.showModal();
  }

  editSupplierInput.addEventListener("focus", () => { renderEditSuppliers(editSupplier ? "" : editSupplierInput.value); setEditPanel(editSupplierInput, editSupplierPanel, true); });
  editSupplierInput.addEventListener("input", () => {
    if (editSupplierInput.value !== editSupplier?.name) clearEditSupplierSelection();
    renderEditSuppliers(editSupplierInput.value);
    setEditPanel(editSupplierInput, editSupplierPanel, true);
  });
  editFactoryInput.addEventListener("focus", () => { if (editSupplier) { renderEditFactories(editFactoryInput.value); setEditPanel(editFactoryInput, editFactoryPanel, true); } });
  editFactoryInput.addEventListener("input", () => { renderEditFactories(editFactoryInput.value); setEditPanel(editFactoryInput, editFactoryPanel, true); });
  editSupplierInput.addEventListener("keydown", (event) => { if (event.key === "Escape") setEditPanel(editSupplierInput, editSupplierPanel, false); });
  editFactoryInput.addEventListener("keydown", (event) => { if (event.key === "Escape") setEditPanel(editFactoryInput, editFactoryPanel, false); });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#edit-supplier-combobox")) setEditPanel(editSupplierInput, editSupplierPanel, false);
    if (!event.target.closest("#edit-factory-multiselect")) setEditPanel(editFactoryInput, editFactoryPanel, false);
  });

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const registration = registrations.find((item) => String(item.record_id) === button.dataset.id && item.registration_type === button.dataset.type);
    if (!registration) return;
    if (button.dataset.action === "edit") openEdit(registration);
    else {
      deleteTarget = registration;
      document.querySelector("#delete-description").textContent = `Delete the registration for ${registration.full_name}? This cannot be undone.`;
      deleteDialog.showModal();
    }
  });

  document.querySelector("#edit-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#edit-status");
    status.textContent = "";
    const type = document.querySelector("#edit-type").value;
    const nameInput = document.querySelector("#edit-name");
    const emailInput = document.querySelector("#edit-email");
    if (nameInput.value.trim().length < 2 || !emailInput.checkValidity()) {
      status.textContent = "Enter a valid name and email address.";
      return;
    }
    let supplierCode = null;
    let supplierName = document.querySelector("#edit-packaging-supplier").value;
    let factories = [];
    if (type === "Supplier" || type === "Factory") {
      factories = [...editFactories.values()];
      if (!editSupplier || !factories.length) {
        status.textContent = "Select a supplier and at least one factory.";
        return;
      }
      if (type === "Factory" && factories.length !== 1) {
        status.textContent = "A factory registration must have exactly one factory.";
        return;
      }
      supplierCode = editSupplier.code;
      supplierName = editSupplier.name;
    }
    const submitButton = event.currentTarget.querySelector("button[type='submit']");
    submitButton.disabled = true;
    try {
      await callRpc("update_admin_registration", {
        p_token: token,
        p_registration_type: type,
        p_id: Number(document.querySelector("#edit-id").value),
        p_full_name: nameInput.value.trim(),
        p_email: emailInput.value.trim().toLocaleLowerCase(),
        p_supplier_code: supplierCode,
        p_supplier_name: supplierName,
        p_factories: factories
      });
      editDialog.close();
      await loadRegistrations();
    } catch (error) { status.textContent = error.message; }
    finally { submitButton.disabled = false; }
  });

  document.querySelector("#delete-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      await callRpc("delete_admin_registration", { p_token: token, p_registration_type: deleteTarget.registration_type, p_id: deleteTarget.record_id });
      deleteDialog.close();
      deleteTarget = null;
      await loadRegistrations();
    } catch (error) { window.alert(error.message); }
    finally { button.disabled = false; }
  });

  document.querySelector("#password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.querySelector("#new-password");
    const status = document.querySelector("#password-status");
    status.className = "inline-status";
    if (input.value.length < 8) { status.textContent = "Use at least 8 characters."; return; }
    const button = event.currentTarget.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      await callRpc("change_admin_password", { p_token: token, p_new_password: input.value });
      input.value = "";
      status.classList.add("success");
      status.textContent = "Password updated. Other sessions were signed out.";
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#${button.dataset.closeDialog}`).close()));
  document.querySelector("#settings-button").addEventListener("click", () => { document.querySelector("#password-status").textContent = ""; settingsDialog.showModal(); });
  refreshButton.addEventListener("click", loadRegistrations);
  searchInput.addEventListener("input", render);
  document.querySelector("#logout-button").addEventListener("click", async () => {
    try { await callRpc("admin_logout", { p_token: token }); } catch (_) { /* clear local session regardless */ }
    returnToLogin();
  });

  if (!token) returnToLogin("session");
  else {
    callRpc("admin_session_valid", { p_token: token }).then((valid) => {
      if (!valid) returnToLogin("session");
      authCheck.hidden = true;
      shell.hidden = false;
      loadRegistrations();
    }).catch((error) => {
      const reason = /could not find the function|schema cache|admin_session_valid/i.test(error.message) ? "setup" : "session";
      returnToLogin(reason);
    });
  }
})();
