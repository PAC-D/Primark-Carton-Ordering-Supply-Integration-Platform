(() => {
  "use strict";

  const suppliers = Array.isArray(window.SUPPLIER_FACTORY_DATA) ? window.SUPPLIER_FACTORY_DATA : [];
  const factoryIndex = new Map();
  suppliers.forEach((supplier) => supplier.factories.forEach((factory) => {
    if (!factoryIndex.has(factory.code)) factoryIndex.set(factory.code, { ...factory, suppliers: [] });
    factoryIndex.get(factory.code).suppliers.push({ code: supplier.code, name: supplier.name });
  }));
  const factories = [...factoryIndex.values()].sort((a, b) => a.name.localeCompare(b.name));
  const state = { supplier: null, selectedFactories: new Map(), registrationFactory: null, allocatedSupplier: null };
  const form = document.querySelector("#registration-form");
  const supplierInput = document.querySelector("#supplier-search");
  const supplierPanel = document.querySelector("#supplier-options");
  const clearSupplierButton = document.querySelector("#clear-supplier");
  const factoryInput = document.querySelector("#factory-search");
  const factoryPanel = document.querySelector("#factory-options");
  const factoryControl = document.querySelector("#factory-multiselect");
  const chips = document.querySelector("#selected-factories");
  const factoryCount = document.querySelector("#factory-count");
  const submitButton = form.querySelector(".submit-button");
  const status = document.querySelector("#form-status");
  const factoryForm = document.querySelector("#factory-registration-form");
  const registrationFactoryInput = document.querySelector("#factory-registration-search");
  const registrationFactoryPanel = document.querySelector("#factory-registration-options");
  const clearRegistrationFactoryButton = document.querySelector("#clear-registration-factory");
  const allocatedSupplierInput = document.querySelector("#allocated-supplier-search");
  const allocatedSupplierPanel = document.querySelector("#allocated-supplier-options");
  const allocatedSupplierControl = document.querySelector("#allocated-supplier-combobox");
  const clearAllocatedSupplierButton = document.querySelector("#clear-allocated-supplier");
  const factoryName = document.querySelector("#factory-name");
  const factoryEmail = document.querySelector("#factory-email");
  const factoryStatus = document.querySelector("#factory-form-status");
  const factorySubmitButton = factoryForm.querySelector(".submit-button");
  const packagingForm = document.querySelector("#packaging-registration-form");
  const packagingSupplier = document.querySelector("#packaging-supplier");
  const packagingName = document.querySelector("#packaging-name");
  const packagingEmail = document.querySelector("#packaging-email");
  const packagingStatus = document.querySelector("#packaging-form-status");
  const packagingSubmitButton = packagingForm.querySelector(".submit-button");
  const typeDialog = document.querySelector("#registration-type-dialog");
  const pageStepLabel = document.querySelector("#page-step-label");
  const registrationHeading = document.querySelector("#registration-heading");

  document.querySelector("#year").textContent = new Date().getFullYear();

  const normalise = (value) => value.toLocaleLowerCase().trim();
  const includesQuery = (item, query) => normalise(`${item.name} ${item.code}`).includes(normalise(query));

  function setPanel(input, panel, open) {
    panel.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
  }

  function renderSingleSelect(panel, items, query, selectedCode, emptyMessage, codeLabel, onSelect) {
    panel.replaceChildren();
    const matches = items.filter((item) => includesQuery(item, query));
    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "empty-option";
      empty.textContent = emptyMessage;
      panel.append(empty);
      return;
    }
    matches.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.role = "option";
      button.setAttribute("aria-selected", String(selectedCode === item.code));
      const text = document.createElement("span");
      text.textContent = item.name;
      const code = document.createElement("small");
      code.textContent = `${codeLabel}: ${item.code}`;
      text.append(code);
      button.append(text);
      button.addEventListener("click", () => onSelect(item));
      panel.append(button);
    });
  }

  function renderRegistrationFactories(query = "") {
    renderSingleSelect(registrationFactoryPanel, factories, query, state.registrationFactory?.code,
      "No factories found", "Factory code", selectRegistrationFactory);
  }

  function selectRegistrationFactory(factory) {
    const changed = state.registrationFactory?.code !== factory.code;
    state.registrationFactory = factory;
    registrationFactoryInput.value = factory.name;
    clearRegistrationFactoryButton.hidden = false;
    setPanel(registrationFactoryInput, registrationFactoryPanel, false);
    clearFactoryRegistrationError("registration");
    if (changed) clearAllocatedSupplier(false);
    allocatedSupplierInput.disabled = false;
    allocatedSupplierInput.placeholder = "Search and select an allocated supplier";
    allocatedSupplierControl.classList.remove("is-disabled");
    renderAllocatedSuppliers();
  }

  function clearRegistrationFactory() {
    state.registrationFactory = null;
    registrationFactoryInput.value = "";
    clearRegistrationFactoryButton.hidden = true;
    setPanel(registrationFactoryInput, registrationFactoryPanel, false);
    clearAllocatedSupplier(false);
    allocatedSupplierInput.disabled = true;
    allocatedSupplierInput.placeholder = "Select a factory first";
    allocatedSupplierControl.classList.add("is-disabled");
    registrationFactoryInput.focus();
  }

  function renderAllocatedSuppliers(query = "") {
    const allocated = state.registrationFactory?.suppliers || [];
    renderSingleSelect(allocatedSupplierPanel, allocated, query, state.allocatedSupplier?.code,
      "No allocated suppliers found", "Supplier code", selectAllocatedSupplier);
  }

  function selectAllocatedSupplier(supplier) {
    state.allocatedSupplier = supplier;
    allocatedSupplierInput.value = supplier.name;
    clearAllocatedSupplierButton.hidden = false;
    setPanel(allocatedSupplierInput, allocatedSupplierPanel, false);
    clearFactoryRegistrationError("supplier");
  }

  function clearAllocatedSupplier(focus = true) {
    state.allocatedSupplier = null;
    allocatedSupplierInput.value = "";
    clearAllocatedSupplierButton.hidden = true;
    setPanel(allocatedSupplierInput, allocatedSupplierPanel, false);
    if (focus && !allocatedSupplierInput.disabled) allocatedSupplierInput.focus();
  }

  function renderSuppliers(query = "") {
    const matches = suppliers.filter((supplier) => includesQuery(supplier, query));
    supplierPanel.replaceChildren();

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "empty-option";
      empty.textContent = "No suppliers found";
      supplierPanel.append(empty);
      return;
    }

    matches.forEach((supplier) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.role = "option";
      button.setAttribute("aria-selected", String(state.supplier?.code === supplier.code));
      const text = document.createElement("span");
      text.textContent = supplier.name;
      const code = document.createElement("small");
      code.textContent = `Supplier code: ${supplier.code}`;
      text.append(code);
      button.append(text);
      button.addEventListener("click", () => selectSupplier(supplier));
      supplierPanel.append(button);
    });
  }

  function selectSupplier(supplier) {
    const changed = state.supplier?.code !== supplier.code;
    state.supplier = supplier;
    supplierInput.value = supplier.name;
    supplierInput.dataset.code = supplier.code;
    clearSupplierButton.hidden = false;
    setPanel(supplierInput, supplierPanel, false);
    clearError("supplier");

    factoryInput.disabled = false;
    factoryInput.placeholder = "Search and select factories";
    factoryControl.classList.remove("is-disabled");
    if (changed) state.selectedFactories.clear();
    factoryInput.value = "";
    renderFactories();
    renderChips();
  }

  function clearSupplier() {
    state.supplier = null;
    state.selectedFactories.clear();
    supplierInput.value = "";
    delete supplierInput.dataset.code;
    clearSupplierButton.hidden = true;
    factoryInput.value = "";
    factoryInput.disabled = true;
    factoryInput.placeholder = "Select a supplier first";
    factoryControl.classList.add("is-disabled");
    setPanel(supplierInput, supplierPanel, false);
    setPanel(factoryInput, factoryPanel, false);
    renderChips();
    supplierInput.focus();
  }

  function clearFactorySelection() {
    state.selectedFactories.clear();
    factoryInput.value = "";
    factoryInput.disabled = true;
    factoryInput.placeholder = "Select a supplier first";
    factoryControl.classList.add("is-disabled");
    setPanel(factoryInput, factoryPanel, false);
    renderChips();
  }

  function renderFactories(query = "") {
    factoryPanel.replaceChildren();
    if (!state.supplier) return;
    const matches = state.supplier.factories.filter((factory) => includesQuery(factory, query));

    const list = document.createElement("div");
    list.className = "options-list";
    list.role = "listbox";
    list.setAttribute("aria-label", "Assigned factories");
    list.setAttribute("aria-multiselectable", "true");

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "empty-option";
      empty.textContent = "No assigned factories found";
      list.append(empty);
    }

    matches.forEach((factory) => {
      const selected = state.selectedFactories.has(factory.code);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.role = "option";
      button.dataset.factoryCode = factory.code;
      button.setAttribute("aria-selected", String(selected));
      const checkbox = document.createElement("span");
      checkbox.className = "option-check";
      checkbox.textContent = selected ? "✓" : "";
      const text = document.createElement("span");
      text.textContent = factory.name;
      const code = document.createElement("small");
      code.textContent = `Factory code: ${factory.code}`;
      text.append(code);
      button.append(checkbox, text);
      button.addEventListener("click", () => toggleFactory(factory, button));
      list.append(button);
    });

    const actions = document.createElement("div");
    actions.className = "options-actions";
    const summary = document.createElement("span");
    const selectedCount = state.selectedFactories.size;
    summary.textContent = `${selectedCount} ${selectedCount === 1 ? "factory" : "factories"} selected`;
    const done = document.createElement("button");
    done.type = "button";
    done.className = "done-button";
    done.textContent = "Done";
    done.addEventListener("click", () => {
      factoryInput.value = "";
      setPanel(factoryInput, factoryPanel, false);
      document.querySelector("#full-name").focus();
    });
    actions.append(summary, done);
    factoryPanel.append(list, actions);
  }

  function toggleFactory(factory, sourceButton) {
    if (state.selectedFactories.has(factory.code)) state.selectedFactories.delete(factory.code);
    else state.selectedFactories.set(factory.code, factory);
    clearError("factory");
    renderFactories(factoryInput.value);
    renderChips();
    if (sourceButton) {
      factoryPanel.querySelector(`[data-factory-code="${factory.code}"]`)?.focus();
    }
  }

  function renderChips() {
    chips.replaceChildren();
    const selected = [...state.selectedFactories.values()];
    factoryCount.textContent = selected.length ? `${selected.length} selected` : "";

    selected.forEach((factory) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      const name = document.createElement("span");
      name.textContent = factory.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${factory.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => toggleFactory(factory));
      chip.append(name, remove);
      chips.append(chip);
    });
  }

  function showError(field, message) {
    const error = document.querySelector(`#${field}-error`);
    const input = field === "supplier" ? supplierInput
      : field === "factory" ? factoryInput
      : document.querySelector(`#${field === "name" ? "full-name" : field}`);
    const control = input.closest(".combo-control") || input;
    error.textContent = message;
    control.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
  }

  function clearError(field) {
    const error = document.querySelector(`#${field}-error`);
    const input = field === "supplier" ? supplierInput
      : field === "factory" ? factoryInput
      : document.querySelector(`#${field === "name" ? "full-name" : field}`);
    const control = input.closest(".combo-control") || input;
    error.textContent = "";
    control.classList.remove("has-error");
    input.removeAttribute("aria-invalid");
  }

  function validate() {
    ["supplier", "factory", "name", "email"].forEach(clearError);
    const name = document.querySelector("#full-name").value.trim();
    const emailInput = document.querySelector("#email");
    const email = emailInput.value.trim();
    let valid = true;

    if (!state.supplier) { showError("supplier", "Please select a supplier."); valid = false; }
    if (!state.selectedFactories.size) { showError("factory", "Select at least one factory."); valid = false; }
    if (name.length < 2) { showError("name", "Please enter your full name."); valid = false; }
    if (!email || !emailInput.checkValidity()) { showError("email", "Enter a valid email address."); valid = false; }
    return valid;
  }

  function registrationPayload() {
    return {
      registration_type: "Supplier",
      supplier_code: state.supplier.code,
      supplier_name: state.supplier.name,
      factories: [...state.selectedFactories.values()].map(({ code, name }) => ({ code, name })),
      full_name: document.querySelector("#full-name").value.trim(),
      email: document.querySelector("#email").value.trim().toLocaleLowerCase()
    };
  }

  function clearFactoryRegistrationError(field) {
    const input = field === "registration" ? registrationFactoryInput
      : field === "supplier" ? allocatedSupplierInput
      : field === "name" ? factoryName : factoryEmail;
    document.querySelector(`#${field === "registration" ? "factory-registration" : field === "supplier" ? "allocated-supplier" : `factory-${field}`}-error`).textContent = "";
    (input.closest(".combo-control") || input).classList.remove("has-error");
    input.removeAttribute("aria-invalid");
  }

  function showFactoryRegistrationError(field, message) {
    const input = field === "registration" ? registrationFactoryInput
      : field === "supplier" ? allocatedSupplierInput
      : field === "name" ? factoryName : factoryEmail;
    document.querySelector(`#${field === "registration" ? "factory-registration" : field === "supplier" ? "allocated-supplier" : `factory-${field}`}-error`).textContent = message;
    (input.closest(".combo-control") || input).classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
  }

  function validateFactoryForm() {
    ["registration", "supplier", "name", "email"].forEach(clearFactoryRegistrationError);
    let valid = true;
    if (!state.registrationFactory) { showFactoryRegistrationError("registration", "Please select a factory."); valid = false; }
    if (!state.allocatedSupplier) { showFactoryRegistrationError("supplier", "Please select an allocated supplier."); valid = false; }
    if (factoryName.value.trim().length < 2) { showFactoryRegistrationError("name", "Please enter your full name."); valid = false; }
    if (!factoryEmail.value.trim() || !factoryEmail.checkValidity()) { showFactoryRegistrationError("email", "Enter a valid email address."); valid = false; }
    return valid;
  }

  function factoryRegistrationPayload() {
    return {
      registration_type: "Factory",
      supplier_code: state.allocatedSupplier.code,
      supplier_name: state.allocatedSupplier.name,
      factories: [{ code: state.registrationFactory.code, name: state.registrationFactory.name }],
      full_name: factoryName.value.trim(),
      email: factoryEmail.value.trim().toLocaleLowerCase()
    };
  }

  async function saveRegistration(payload, table = "registrations") {
    const config = window.SUPABASE_CONFIG || {};
    const publishableKey = config.publishableKey || config.anonKey;
    if (!config.url || !publishableKey) {
      console.info("Supabase is not configured. Validated registration:", payload);
      return { demo: true };
    }

    const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let detail = "The registration could not be saved.";
      try { detail = (await response.json()).message || detail; } catch (_) { /* non-JSON error */ }
      throw new Error(detail);
    }
    return { demo: false };
  }

  function resetForm() {
    form.reset();
    state.supplier = null;
    state.selectedFactories.clear();
    clearSupplierButton.hidden = true;
    factoryInput.disabled = true;
    factoryInput.placeholder = "Select a supplier first";
    factoryControl.classList.add("is-disabled");
    renderChips();
  }

  function resetFactoryForm() {
    factoryForm.reset();
    state.registrationFactory = null;
    state.allocatedSupplier = null;
    clearRegistrationFactoryButton.hidden = true;
    clearAllocatedSupplierButton.hidden = true;
    allocatedSupplierInput.disabled = true;
    allocatedSupplierInput.placeholder = "Select a factory first";
    allocatedSupplierControl.classList.add("is-disabled");
  }

  function showTypeSelection() {
    if (!typeDialog.open) typeDialog.showModal();
  }

  function selectRegistrationType(type) {
    const packaging = type === "packaging";
    const factory = type === "factory";
    form.hidden = packaging || factory;
    factoryForm.hidden = !factory;
    packagingForm.hidden = !packaging;
    status.hidden = true;
    status.className = "form-status";
    packagingStatus.hidden = true;
    packagingStatus.className = "form-status";
    factoryStatus.hidden = true;
    factoryStatus.className = "form-status";
    pageStepLabel.textContent = packaging ? "Packaging supplier registration" : factory ? "Factory registration" : "Supplier registration";
    registrationHeading.textContent = packaging
      ? "Create your packaging supplier access request"
      : factory ? "Create your factory access request" : "Create your supplier access request";
    typeDialog.close();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSuccess(target, message) {
    const text = document.createElement("span");
    text.textContent = message;
    const returnButton = document.createElement("button");
    returnButton.type = "button";
    returnButton.className = "selection-return";
    returnButton.textContent = "Choose another registration type";
    returnButton.addEventListener("click", showTypeSelection);
    target.replaceChildren(text, document.createElement("br"), returnButton);
    target.className = "form-status success";
    target.hidden = false;
  }

  function clearPackagingError(field) {
    const input = field === "supplier" ? packagingSupplier : field === "name" ? packagingName : packagingEmail;
    document.querySelector(`#packaging-${field}-error`).textContent = "";
    input.classList.remove("has-error");
    input.removeAttribute("aria-invalid");
  }

  function showPackagingError(field, message) {
    const input = field === "supplier" ? packagingSupplier : field === "name" ? packagingName : packagingEmail;
    document.querySelector(`#packaging-${field}-error`).textContent = message;
    input.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
  }

  function validatePackagingForm() {
    ["supplier", "name", "email"].forEach(clearPackagingError);
    let valid = true;
    if (!packagingSupplier.value) { showPackagingError("supplier", "Please select a packaging supplier."); valid = false; }
    if (packagingName.value.trim().length < 2) { showPackagingError("name", "Please enter your full name."); valid = false; }
    if (!packagingEmail.value.trim() || !packagingEmail.checkValidity()) { showPackagingError("email", "Enter a valid email address."); valid = false; }
    return valid;
  }

  supplierInput.addEventListener("focus", () => { renderSuppliers(state.supplier ? "" : supplierInput.value); setPanel(supplierInput, supplierPanel, true); });
  supplierInput.addEventListener("input", () => {
    if (supplierInput.value !== state.supplier?.name) {
      state.supplier = null;
      delete supplierInput.dataset.code;
      clearSupplierButton.hidden = !supplierInput.value;
      clearFactorySelection();
    }
    renderSuppliers(supplierInput.value);
    setPanel(supplierInput, supplierPanel, true);
  });
  supplierInput.addEventListener("keydown", (event) => { if (event.key === "Escape") setPanel(supplierInput, supplierPanel, false); });
  clearSupplierButton.addEventListener("click", clearSupplier);

  factoryInput.addEventListener("focus", () => { renderFactories(factoryInput.value); setPanel(factoryInput, factoryPanel, true); });
  factoryInput.addEventListener("input", () => { renderFactories(factoryInput.value); setPanel(factoryInput, factoryPanel, true); });
  factoryInput.addEventListener("keydown", (event) => { if (event.key === "Escape") setPanel(factoryInput, factoryPanel, false); });
  factoryControl.addEventListener("click", (event) => event.stopPropagation());

  registrationFactoryInput.addEventListener("focus", () => { renderRegistrationFactories(state.registrationFactory ? "" : registrationFactoryInput.value); setPanel(registrationFactoryInput, registrationFactoryPanel, true); });
  registrationFactoryInput.addEventListener("input", () => {
    if (registrationFactoryInput.value !== state.registrationFactory?.name) {
      state.registrationFactory = null;
      clearRegistrationFactoryButton.hidden = !registrationFactoryInput.value;
      clearAllocatedSupplier(false);
      allocatedSupplierInput.disabled = true;
      allocatedSupplierInput.placeholder = "Select a factory first";
      allocatedSupplierControl.classList.add("is-disabled");
    }
    renderRegistrationFactories(registrationFactoryInput.value);
    setPanel(registrationFactoryInput, registrationFactoryPanel, true);
  });
  registrationFactoryInput.addEventListener("keydown", (event) => { if (event.key === "Escape") setPanel(registrationFactoryInput, registrationFactoryPanel, false); });
  clearRegistrationFactoryButton.addEventListener("click", clearRegistrationFactory);

  allocatedSupplierInput.addEventListener("focus", () => { if (state.registrationFactory) { renderAllocatedSuppliers(state.allocatedSupplier ? "" : allocatedSupplierInput.value); setPanel(allocatedSupplierInput, allocatedSupplierPanel, true); } });
  allocatedSupplierInput.addEventListener("input", () => {
    if (allocatedSupplierInput.value !== state.allocatedSupplier?.name) {
      state.allocatedSupplier = null;
      clearAllocatedSupplierButton.hidden = !allocatedSupplierInput.value;
    }
    renderAllocatedSuppliers(allocatedSupplierInput.value);
    setPanel(allocatedSupplierInput, allocatedSupplierPanel, true);
  });
  allocatedSupplierInput.addEventListener("keydown", (event) => { if (event.key === "Escape") setPanel(allocatedSupplierInput, allocatedSupplierPanel, false); });
  clearAllocatedSupplierButton.addEventListener("click", () => clearAllocatedSupplier());

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#supplier-combobox")) setPanel(supplierInput, supplierPanel, false);
    if (!event.target.closest("#factory-multiselect")) setPanel(factoryInput, factoryPanel, false);
    if (!event.target.closest("#factory-registration-combobox")) setPanel(registrationFactoryInput, registrationFactoryPanel, false);
    if (!event.target.closest("#allocated-supplier-combobox")) setPanel(allocatedSupplierInput, allocatedSupplierPanel, false);
  });

  document.querySelector("#full-name").addEventListener("input", () => clearError("name"));
  document.querySelector("#email").addEventListener("input", () => clearError("email"));
  packagingSupplier.addEventListener("change", () => clearPackagingError("supplier"));
  packagingName.addEventListener("input", () => clearPackagingError("name"));
  packagingEmail.addEventListener("input", () => clearPackagingError("email"));
  factoryName.addEventListener("input", () => clearFactoryRegistrationError("name"));
  factoryEmail.addEventListener("input", () => clearFactoryRegistrationError("email"));

  typeDialog.addEventListener("cancel", (event) => event.preventDefault());
  document.querySelector("#choose-supplier").addEventListener("click", () => selectRegistrationType("supplier"));
  document.querySelector("#choose-factory").addEventListener("click", () => selectRegistrationType("factory"));
  document.querySelector("#choose-packaging").addEventListener("click", () => selectRegistrationType("packaging"));
  document.querySelectorAll("[data-open-type-dialog]").forEach((button) => {
    button.addEventListener("click", showTypeSelection);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.hidden = true;
    status.className = "form-status";
    if (!validate()) {
      form.querySelector("[aria-invalid='true']")?.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Submitting…";
    try {
      const result = await saveRegistration(registrationPayload());
      showSuccess(status, result.demo
        ? "Registration validated in demo mode. Add your Supabase credentials to save submissions."
        : "Thank you. Your registration has been submitted successfully.");
      resetForm();
    } catch (error) {
      status.classList.add("error");
      status.textContent = error.message || "Something went wrong. Please try again.";
      status.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector("span").textContent = "Submit registration";
    }
  });

  factoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    factoryStatus.hidden = true;
    factoryStatus.className = "form-status";
    if (!validateFactoryForm()) {
      factoryForm.querySelector("[aria-invalid='true']")?.focus();
      return;
    }

    factorySubmitButton.disabled = true;
    factorySubmitButton.querySelector("span").textContent = "Submitting…";
    try {
      const result = await saveRegistration(factoryRegistrationPayload());
      showSuccess(factoryStatus, result.demo
        ? "Registration validated in demo mode. Add your Supabase credentials to save submissions."
        : "Thank you. Your factory registration has been submitted successfully.");
      resetFactoryForm();
    } catch (error) {
      factoryStatus.classList.add("error");
      factoryStatus.textContent = error.message || "Something went wrong. Please try again.";
      factoryStatus.hidden = false;
    } finally {
      factorySubmitButton.disabled = false;
      factorySubmitButton.querySelector("span").textContent = "Submit registration";
    }
  });

  packagingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    packagingStatus.hidden = true;
    packagingStatus.className = "form-status";
    if (!validatePackagingForm()) {
      packagingForm.querySelector("[aria-invalid='true']")?.focus();
      return;
    }

    packagingSubmitButton.disabled = true;
    packagingSubmitButton.querySelector("span").textContent = "Submitting…";
    const payload = {
      packaging_supplier: packagingSupplier.value,
      full_name: packagingName.value.trim(),
      email: packagingEmail.value.trim().toLocaleLowerCase()
    };

    try {
      const result = await saveRegistration(payload, "packaging_registrations");
      showSuccess(packagingStatus, result.demo
        ? "Registration validated in demo mode. Add your Supabase credentials to save submissions."
        : "Thank you. Your packaging supplier registration has been submitted successfully.");
      packagingForm.reset();
    } catch (error) {
      packagingStatus.classList.add("error");
      packagingStatus.textContent = error.message || "Something went wrong. Please try again.";
      packagingStatus.hidden = false;
    } finally {
      packagingSubmitButton.disabled = false;
      packagingSubmitButton.querySelector("span").textContent = "Submit registration";
    }
  });

  renderSuppliers();
  showTypeSelection();
})();
