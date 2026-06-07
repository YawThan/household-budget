import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =========================================================================
// 1. FIREBASE INITIALIZATION (PASTE YOUR ACTUAL CONFIG VALUES HERE)
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAU3Y4bIzWiGDUn4s0_efGebCahZQBmKv8",
    authDomain: "householdbudget-28f60.firebaseapp.com",
    projectId: "householdbudget-28f60",
    storageBucket: "householdbudget-28f60.firebasestorage.app",
    messagingSenderId: "155314867342",
    appId: "1:155314867342:web:5dac3c253a2e3d39458ddf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Pinpointing a static document reference for your shared household balance pool
const budgetDocRef = doc(db, "budgets", "shared_pool");

// =========================================================================
// 2. IN-MEMORY APPLICATION STATE
// =========================================================================
let totalBudget = 0;
let remainingBudget = 0;
let expenses = [];

// =========================================================================
// 3. UI ELEMENT SELECTORS
// =========================================================================
const budgetInput = document.getElementById('budget-input');
const setBudgetBtn = document.getElementById('set-budget-btn');
const remainingDisplay = document.getElementById('remaining-display');
const totalDisplay = document.getElementById('total-display');
const balanceContainer = document.getElementById('balance-container');

const expenseUserInput = document.getElementById('expense-user');
const expenseNameInput = document.getElementById('expense-name');
const expenseAmountInput = document.getElementById('expense-amount');
const addExpenseBtn = document.getElementById('add-expense-btn');
const historyList = document.getElementById('history-list');

// =========================================================================
// 4. REAL-TIME CLOUD SYNCHRONIZER
// =========================================================================
onSnapshot(budgetDocRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        totalBudget = data.totalBudget || 0;
        remainingBudget = data.remainingBudget || 0;
        expenses = data.expenses || [];
    } else {
        totalBudget = 0;
        remainingBudget = 0;
        expenses = [];
    }
    updateUI();
});

// =========================================================================
// 5. EVENT ACTIONS (Pushes mutations directly to the Cloud)
// =========================================================================
async function handleSetBudget() {
    const inputVal = parseFloat(budgetInput.value);

    if (isNaN(inputVal) || inputVal <= 0) {
        alert("Please enter a valid budget amount greater than 0.");
        return;
    }

    try {
        await setDoc(budgetDocRef, {
            totalBudget: inputVal,
            remainingBudget: inputVal,
            expenses: []
        });
        budgetInput.value = "";
    } catch (err) {
        console.error("Database connection failed:", err);
    }
}

async function handleAddExpense() {
    const user = expenseUserInput.value;
    const name = expenseNameInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value);

    if (name === "" || isNaN(amount) || amount <= 0) {
        alert("Please provide a valid descriptive name and numerical cost.");
        return;
    }

    try {
        await updateDoc(budgetDocRef, {
            remainingBudget: remainingBudget - amount,
            expenses: arrayUnion({
                id: Date.now(),
                user: user,
                name: name,
                amount: amount
            })
        });
        expenseNameInput.value = "";
        expenseAmountInput.value = "";
    } catch (err) {
        console.error("Failed to commit write operation:", err);
    }
}

// =========================================================================
// 6. RENDER INTERFACE
// =========================================================================
function updateUI() {
    remainingDisplay.textContent = remainingBudget.toFixed(2);
    totalDisplay.textContent = totalBudget.toFixed(2);

    balanceContainer.className = "balance"; 
    if (remainingBudget > 0) {
        balanceContainer.classList.add("positive");
    } else if (remainingBudget < 0) {
        balanceContainer.classList.add("negative");
    } else {
        balanceContainer.classList.add("neutral");
    }

    historyList.innerHTML = ""; 
    for (let i = expenses.length - 1; i >= 0; i--) {
        const item = expenses[i];
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="expense-info">
                <span class="badge">${item.user}</span>
                <span class="expense-item-name">${item.name}</span>
            </div>
            <span class="expense-amount">-$${item.amount.toFixed(2)}</span>
        `;
        historyList.appendChild(li);
    }
}

setBudgetBtn.addEventListener('click', handleSetBudget);
addExpenseBtn.addEventListener('click', handleAddExpense);