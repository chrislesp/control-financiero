const PERIODS_KEY = "cf_periods_v2";
const ACTIVE_PERIOD_KEY = "cf_active_period_id";

const VALID_CATEGORY_TYPES = ["ingreso", "gasto", "ahorro", "budget"];
const VALID_TRANSACTION_TYPES = ["ingreso", "gasto", "ahorro"];

function createId(prefix) {
  if (window.crypto && window.crypto.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeCategoryType(value) {
  return VALID_CATEGORY_TYPES.includes(value) ? value : "budget";
}

function normalizeTransactionType(value) {
  return VALID_TRANSACTION_TYPES.includes(value) ? value : "gasto";
}

function inferCategoryType(category) {
  if (category.type) return normalizeCategoryType(category.type);
  if (Number(category.budget || 0) > 0) return "budget";
  return "gasto";
}

function normalizeOldCategory(category) {
  if (typeof category === "string") {
    return {
      id: createId("cat"),
      name: category,
      type: "gasto",
      budget: 0,
      savingSourceCategoryId: "",
      savingMode: "percent",
      savingValue: 0
    };
  }

  const type = inferCategoryType(category);

  return {
    id: category.id || createId("cat"),
    name: category.name || category.titulo || "Categoría",
    type,
    budget: type === "budget" ? Number(category.budget || 0) : 0,
    savingSourceCategoryId: category.savingSourceCategoryId || "",
    savingMode: category.savingMode === "fixed" ? "fixed" : "percent",
    savingValue: Number(category.savingValue || 0)
  };
}

function normalizeOldTransaction(transaction, categories) {
  const categoryName = transaction.categoria || transaction.categoryName || transaction.titulo || "";
  const category = categories.find((cat) => cat.name === categoryName || cat.id === transaction.categoryId);
  const categoryType = category?.type || "";

  let type = transaction.tipo || transaction.type || "gasto";

  if (categoryType === "ingreso") type = "ingreso";
  if (categoryType === "gasto" || categoryType === "budget") type = "gasto";
  if (categoryType === "ahorro") type = "ahorro";

  return {
    id: transaction.id || createId("tx"),
    categoryId: transaction.categoryId || category?.id || "",
    categoryName: category?.name || categoryName,
    description: transaction.descripcion || transaction.description || "",
    amount: Number(transaction.cantidad || transaction.amount || 0),
    type: normalizeTransactionType(type),
    sourceIncomeCategoryId: transaction.sourceIncomeCategoryId || "",
    sourceIncomeCategoryName: transaction.sourceIncomeCategoryName || "",
    linkedTransactionId: transaction.linkedTransactionId || "",
    isAutoSaving: Boolean(transaction.isAutoSaving)
  };
}

function normalizePeriod(period) {
  const categories = Array.isArray(period.categories)
    ? period.categories.map(normalizeOldCategory)
    : [];

  const transactions = {};
  const rawTransactions = period.transactions || {};

  Object.keys(rawTransactions).forEach((dateKey) => {
    transactions[dateKey] = rawTransactions[dateKey].map((transaction) =>
      normalizeOldTransaction(transaction, categories)
    );
  });

  return {
    id: period.id || createId("period"),
    name: period.name || period.title || `${period.startDate || period.start || "Periodo"} - ${period.endDate || period.end || ""}`,
    startDate: period.startDate || period.start || "",
    endDate: period.endDate || period.end || "",
    style: period.style || "libre",
    budget: Number(period.budget || 0),
    categories,
    transactions
  };
}

function migrateOldDataIfNeeded() {
  const existing = readJSON(PERIODS_KEY, null);

  if (Array.isArray(existing)) {
    const normalized = existing.map(normalizePeriod);
    writeJSON(PERIODS_KEY, normalized);
    return normalized;
  }

  const oldPeriods = readJSON("periods", []);
  const oldCategories = readJSON("categorias", []);
  const oldTransactions = readJSON("transactions", {});

  if (oldPeriods.length === 0 && oldCategories.length === 0 && Object.keys(oldTransactions).length === 0) {
    writeJSON(PERIODS_KEY, []);
    return [];
  }

  const categories = oldCategories.map(normalizeOldCategory);
  const transactions = {};

  Object.keys(oldTransactions).forEach((dateKey) => {
    transactions[dateKey] = oldTransactions[dateKey].map((transaction) =>
      normalizeOldTransaction(transaction, categories)
    );
  });

  const firstOldPeriod = oldPeriods[0];
  let startDate = "";
  let endDate = "";
  let budget = 0;

  if (typeof firstOldPeriod === "string") {
    const pieces = firstOldPeriod.split(" - ");
    startDate = pieces[0] || "";
    endDate = pieces[1] || "";
  } else if (firstOldPeriod) {
    startDate = firstOldPeriod.startDate || firstOldPeriod.start || "";
    endDate = firstOldPeriod.endDate || firstOldPeriod.end || "";
    budget = Number(firstOldPeriod.budget || 0);
  }

  const migratedPeriod = {
    id: createId("period"),
    name: "Periodo migrado",
    startDate,
    endDate,
    style: "budget",
    budget,
    categories,
    transactions
  };

  const migrated = [normalizePeriod(migratedPeriod)];
  writeJSON(PERIODS_KEY, migrated);
  localStorage.setItem(ACTIVE_PERIOD_KEY, migrated[0].id);
  return migrated;
}

export function generateId(prefix) {
  return createId(prefix);
}

export function getPeriods() {
  return migrateOldDataIfNeeded();
}

export function savePeriods(periods) {
  writeJSON(PERIODS_KEY, periods.map(normalizePeriod));
}

export function getActivePeriodId() {
  return localStorage.getItem(ACTIVE_PERIOD_KEY) || "";
}

export function setActivePeriodId(periodId) {
  localStorage.setItem(ACTIVE_PERIOD_KEY, periodId);
}

export function getActivePeriod() {
  const periods = getPeriods();
  const activeId = getActivePeriodId();
  return periods.find((period) => period.id === activeId) || periods[0] || null;
}

export function addPeriod(periodData) {
  const periods = getPeriods();
  const period = normalizePeriod({
    id: createId("period"),
    ...periodData,
    categories: [],
    transactions: {}
  });

  periods.push(period);
  savePeriods(periods);
  setActivePeriodId(period.id);
  return period;
}

export function deletePeriod(periodId) {
  const periods = getPeriods().filter((period) => period.id !== periodId);
  savePeriods(periods);

  if (getActivePeriodId() === periodId) {
    if (periods[0]) {
      setActivePeriodId(periods[0].id);
    } else {
      localStorage.removeItem(ACTIVE_PERIOD_KEY);
    }
  }
}

export function updatePeriod(updatedPeriod) {
  const periods = getPeriods().map((period) =>
    period.id === updatedPeriod.id ? normalizePeriod(updatedPeriod) : period
  );
  savePeriods(periods);
}

export function addCategoryToActivePeriod(categoryData) {
  const period = getActivePeriod();
  if (!period) return null;

  const category = normalizeOldCategory({
    id: createId("cat"),
    ...categoryData
  });

  period.categories.push(category);
  updatePeriod(period);
  return category;
}

export function deleteCategoryFromActivePeriod(categoryId) {
  const period = getActivePeriod();
  if (!period) return;

  period.categories = period.categories.filter((category) => category.id !== categoryId);

  Object.keys(period.transactions).forEach((dateKey) => {
    period.transactions[dateKey] = period.transactions[dateKey].filter(
      (transaction) => transaction.categoryId !== categoryId
    );

    if (period.transactions[dateKey].length === 0) {
      delete period.transactions[dateKey];
    }
  });

  updatePeriod(period);
}

export function addTransactionToActivePeriod(dateKey, transactionData) {
  const period = getActivePeriod();
  if (!period) return null;

  if (!period.transactions[dateKey]) {
    period.transactions[dateKey] = [];
  }

  const category = period.categories.find((cat) => cat.id === transactionData.categoryId);
  let type = normalizeTransactionType(transactionData.type || "gasto");

  if (category) {
    if (category.type === "ingreso") type = "ingreso";
    if (category.type === "gasto" || category.type === "budget") type = "gasto";
    if (category.type === "ahorro") type = "ahorro";
  }

  const transaction = {
    id: createId("tx"),
    categoryId: transactionData.categoryId || "",
    categoryName: category?.name || transactionData.categoryName || "",
    description: transactionData.description || "",
    amount: Number(transactionData.amount || 0),
    type,
    sourceIncomeCategoryId: transactionData.sourceIncomeCategoryId || "",
    sourceIncomeCategoryName: transactionData.sourceIncomeCategoryName || "",
    linkedTransactionId: transactionData.linkedTransactionId || "",
    isAutoSaving: Boolean(transactionData.isAutoSaving)
  };

  period.transactions[dateKey].push(transaction);
  updatePeriod(period);
  return transaction;
}

export function deleteTransactionFromActivePeriod(dateKey, transactionId) {
  const period = getActivePeriod();
  if (!period || !period.transactions[dateKey]) return;

  period.transactions[dateKey] = period.transactions[dateKey].filter(
    (transaction) => transaction.id !== transactionId && transaction.linkedTransactionId !== transactionId
  );

  if (period.transactions[dateKey].length === 0) {
    delete period.transactions[dateKey];
  }

  updatePeriod(period);
}
