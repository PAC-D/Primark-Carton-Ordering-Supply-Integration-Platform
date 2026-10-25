(() => {
  "use strict";

  const suppliers = Array.isArray(window.SUPPLIER_FACTORY_DATA) ? window.SUPPLIER_FACTORY_DATA : [];
  const state = { supplier: null, selectedFactories: new Map() };
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

  document.querySelector("#year").textContent = new Date().getFullYear();

  const normalise = (value) => value.toLocaleLowerCase().trim();
  const includesQuery = (item, query) => normalise(`${item.name} ${item.code}`).includes(normalise(query));

  function setPanel(input, panel, open) {
    panel.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
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
      supplier_code: state.supplier.code,
      supplier_name: state.supplier.name,
      factories: [...state.selectedFactories.values()].map(({ code, name }) => ({ code, name })),
      full_name: document.querySelector("#full-name").value.trim(),
      email: document.querySelector("#email").value.trim().toLocaleLowerCase()
    };
  }

  async function saveRegistration(payload) {
    const config = window.SUPABASE_CONFIG || {};
    const publishableKey = config.publishableKey || config.anonKey;
    if (!config.url || !publishableKey) {
      console.info("Supabase is not configured. Validated registration:", payload);
      return { demo: true };
    }

    const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/registrations`, {
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

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#supplier-combobox")) setPanel(supplierInput, supplierPanel, false);
    if (!event.target.closest("#factory-multiselect")) setPanel(factoryInput, factoryPanel, false);
  });

  document.querySelector("#full-name").addEventListener("input", () => clearError("name"));
  document.querySelector("#email").addEventListener("input", () => clearError("email"));

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
      status.classList.add("success");
      status.textContent = result.demo
        ? "Registration validated in demo mode. Add your Supabase credentials to save submissions."
        : "Thank you. Your registration has been submitted successfully.";
      status.hidden = false;
      if (!result.demo) resetForm();
    } catch (error) {
      status.classList.add("error");
      status.textContent = error.message || "Something went wrong. Please try again.";
      status.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector("span").textContent = "Submit registration";
    }
  });

  renderSuppliers();
})();
