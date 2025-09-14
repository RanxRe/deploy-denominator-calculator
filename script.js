document.addEventListener("DOMContentLoaded", function () {
  // Denomination data
  const denominations = {
    notes: [
      { value: 2000, label: "₹2000" },
      { value: 500, label: "₹500" },
      { value: 200, label: "₹200" },
      { value: 100, label: "₹100" },
      { value: 50, label: "₹50" },
      { value: 20, label: "₹20" },
      { value: 10, label: "₹10" },
    ],
    coins: [
      { value: 20, label: "₹20" },
      { value: 10, label: "₹10" },
      { value: 5, label: "₹5" },
      { value: 2, label: "₹2" },
      { value: 1, label: "₹1" },
    ],
  };

  // DOM elements
  const notesGrid = document.getElementById("notes-grid");
  const coinsGrid = document.getElementById("coins-grid");
  const totalAmountElement = document.getElementById("total-amount");
  const resetButton = document.getElementById("reset-btn");

  // Create denomination items
  function createDenominationItem(denomination) {
    const item = document.createElement("div");
    item.className = "denomination-item";

    const valueSpan = document.createElement("span");
    valueSpan.className = "denomination-value";
    valueSpan.textContent = denomination.label;

    const input = document.createElement("input");
    input.type = "number";
    input.className = "denomination-input";
    input.min = "0";
    input.value = "0";
    input.dataset.value = denomination.value;

    const totalSpan = document.createElement("span");
    totalSpan.className = "denomination-total";
    totalSpan.textContent = "₹0";
    totalSpan.dataset.value = "0";

    item.appendChild(valueSpan);
    item.appendChild(input);
    item.appendChild(totalSpan);

    // Add event listener for input changes
    input.addEventListener("input", updateCalculations);

    return item;
  }

  // Populate grids with denominations
  function populateGrids() {
    denominations.notes.forEach((note) => {
      notesGrid.appendChild(createDenominationItem(note));
    });

    denominations.coins.forEach((coin) => {
      coinsGrid.appendChild(createDenominationItem(coin));
    });
  }

  // Update calculations when input changes
  function updateCalculations() {
    let total = 0;

    // Update individual totals and calculate grand total
    document.querySelectorAll(".denomination-input").forEach((input) => {
      const quantity = parseInt(input.value) || 0;
      const value = parseInt(input.dataset.value);
      const itemTotal = quantity * value;

      // Update the item's total display
      const totalSpan = input.nextElementSibling;
      totalSpan.textContent = `₹${itemTotal}`;
      totalSpan.dataset.value = itemTotal;

      total += itemTotal;
    });

    // Update the grand total
    totalAmountElement.textContent = `₹${total.toLocaleString()}`;
  }

  // Reset all inputs
  function resetCalculator() {
    document.querySelectorAll(".denomination-input").forEach((input) => {
      input.value = "0";
    });
    updateCalculations();
  }

  // Initialize the app
  function init() {
    populateGrids();
    resetButton.addEventListener("click", resetCalculator);
  }

  init();
});
