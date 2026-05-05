import {
  openCategoryPopup,
  closeCategoryPopup,
  openPeriodPopup,
  closePeriodPopup,
  closeTransactionPopup,
  addCategory,
  addPeriod,
  addTransaction,
  goToPreviousMonth,
  goToNextMonth,
  switchToCalendarView,
  switchToListView,
  openHomePage,
  bypassHome,
  updatePeriodStyleUI,
  updateCategoryTypeUI,
  updateTransactionTypeUI,
  updateSavingPreview,
  updatePlannerRuleFrequencyUI,
  addPlannerRule,
  updatePlannerPreview,
  initUI
} from "./ui.js";

function setupEventListeners() {
  document.getElementById("openCategoryBtn").addEventListener("click", openCategoryPopup);
  document.getElementById("closeCategoryBtn").addEventListener("click", closeCategoryPopup);
  document.getElementById("addCategoryBtn").addEventListener("click", addCategory);
  document.getElementById("catType").addEventListener("change", updateCategoryTypeUI);

  document.getElementById("openPeriodBtn").addEventListener("click", openPeriodPopup);
  document.getElementById("homeCreatePeriodBtn").addEventListener("click", openPeriodPopup);
  document.getElementById("homeSkipBtn").addEventListener("click", bypassHome);
  document.getElementById("goHomeBtn").addEventListener("click", openHomePage);
  document.getElementById("closePeriodBtn").addEventListener("click", closePeriodPopup);
  document.getElementById("addPeriodBtn").addEventListener("click", addPeriod);
  document.getElementById("periodStyle").addEventListener("change", updatePeriodStyleUI);
  document.getElementById("periodStart").addEventListener("change", updatePlannerPreview);
  document.getElementById("periodEnd").addEventListener("change", updatePlannerPreview);
  document.getElementById("plannerRuleFrequency").addEventListener("change", updatePlannerRuleFrequencyUI);
  document.getElementById("addPlannerRuleBtn").addEventListener("click", addPlannerRule);
  document.getElementById("plannerFlexibleCategories").addEventListener("input", updatePlannerPreview);

  document.getElementById("categoriaSelect").addEventListener("change", updateTransactionTypeUI);
  document.getElementById("saveToCategorySelect").addEventListener("change", updateSavingPreview);
  document.getElementById("savingAmountMode").addEventListener("change", updateSavingPreview);
  document.getElementById("savingAmountValue").addEventListener("input", updateSavingPreview);
  document.getElementById("cantidad").addEventListener("input", updateSavingPreview);
  document.getElementById("closeTransactionBtn").addEventListener("click", closeTransactionPopup);
  document.getElementById("addTransactionBtn").addEventListener("click", addTransaction);

  document.getElementById("prevMonthBtn").addEventListener("click", goToPreviousMonth);
  document.getElementById("nextMonthBtn").addEventListener("click", goToNextMonth);

  document.getElementById("calendarViewBtn").addEventListener("click", switchToCalendarView);
  document.getElementById("listViewBtn").addEventListener("click", switchToListView);
}

function init() {
  setupEventListeners();
  initUI();
}

window.addEventListener("DOMContentLoaded", init);
