import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =========================================================================
// 1. FIREBASE SETUP (PASTE YOUR ACTUAL APP CREDENTIALS HERE)
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
const budgetDocRef = doc(db, "budgets", "shared_pool");

// =========================================================================
// 2. STATE MANAGER VARIABLES
// =========================================================================
let balances = {
    ZKL_Kpay: 0,
    ZKL_Cash: 0,
    HYW_Kpay: 0,
    HYW_Cash: 0
};
let transactions = [];

// =========================================================================
// 3. UI ELEMENT SELECTORS
// =========================================================================
const totalCombinedDisplay = document.getElementById('total-combined-display');
const zklKpayDisplay = document.getElementById('zkl-kpay-display');
const zklCashDisplay = document.getElementById('zkl-cash-display');
const hywKpayDisplay = document.getElementById('hyw-kpay-display');
const hywCashDisplay = document.getElementById('hyw-cash-display');
const balanceContainer = document.getElementById('balance-container');

// Income Inputs
const incomeWallet = document.getElementById('income-wallet');
const incomeName = document.getElementById('income-name');
const incomeAmount = document.getElementById('income-amount');
const addIncomeBtn = document.getElementById('add-income-btn');

// Expense Inputs
const expenseWallet = document.getElementById('expense-wallet');
const expenseName = document.getElementById('expense-name');
const expenseAmount = document.getElementById('expense-amount');
const addExpenseBtn = document.getElementById('add-expense-btn');

const historyList = document.getElementById('history-list');

// =========================================================================
// 4. REAL-TIME DATABASE SYNC LISTENER
// =========================================================================
onSnapshot(budgetDocRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        balances = data.balances || { ZKL_Kpay: 0, ZKL_Cash: 0, HYW_Kpay: 0, HYW_Cash: 0 };
        transactions = data.transactions || [];
    } else {
        // Run structure initialization if completely blank cloud footprint is detected
        balances = { ZKL_Kpay: 0, ZKL_Cash: 0, HYW_Kpay: 0, HYW_Cash: 0 };
        transactions = [];
    }
    updateUI();
});

// =========================================================================
// 5. TRANSACTION MUTATION HANDLERS
// =========================================================================

async function handleTransaction(type, walletKey, nameStr, amountNum) {
    const updatedBalances = { ...balances };

    if (type === 'income') {
        updatedBalances[walletKey] += amountNum;
    } else if (type === 'expense') {
        updatedBalances[walletKey] -= amountNum;
    }

    try {
        await setDoc(budgetDocRef, {
            balances: updatedBalances,
            transactions: arrayUnion({
                id: Date.now(),
                type: type,
                wallet: walletKey,
                name: nameStr,
                amount: amountNum
            })
        }, { merge: true });
    } catch (err) {
        console.error("Cloud mutation transaction failed:", err);
        alert("Failed to synchronize with database.");
    }
}

addIncomeBtn.addEventListener('click', async () => {
    const wallet = incomeWallet.value;
    const name = incomeName.value.trim();
    const amount = parseFloat(incomeAmount.value);

    if (name === "" || isNaN(amount) || amount <= 0) {
        alert("Please provide valid data input details.");
        return;
    }

    await handleTransaction('income', wallet, name, amount);
    incomeName.value = "";
    incomeAmount.value = "";
});

addExpenseBtn.addEventListener('click', async () => {
    const wallet = expenseWallet.value;
    const name = expenseName.value.trim();
    const amount = parseFloat(expenseAmount.value);

    if (name === "" || isNaN(amount) || amount <= 0) {
        alert("Please provide valid data input details.");
        return;
    }

    await handleTransaction('expense', wallet, name, amount);
    expenseName.value = "";
    expenseAmount.value = "";
});

// =========================================================================
// 6. RENDER INTERFACE UI
// =========================================================================
function updateUI() {
    // Write individual sub-wallets
    zklKpayDisplay.textContent = balances.ZKL_Kpay.toFixed(2);
    zklCashDisplay.textContent = balances.ZKL_Cash.toFixed(2);
    hywKpayDisplay.textContent = balances.HYW_Kpay.toFixed(2);
    hywCashDisplay.textContent = balances.HYW_Cash.toFixed(2);

    // Compute and display cumulative master total status
    const combinedTotal = balances.ZKL_Kpay + balances.ZKL_Cash + balances.HYW_Kpay + balances.HYW_Cash;
    totalCombinedDisplay.textContent = combinedTotal.toFixed(2);

    balanceContainer.className = "balance";
    if (combinedTotal > 0) balanceContainer.classList.add("positive");
    else if (combinedTotal < 0) balanceContainer.classList.add("negative");
    else balanceContainer.classList.add("neutral");

    // Populate log entries mapping newest activities first
    historyList.innerHTML = "";
    for (let i = transactions.length - 1; i >= 0; i--) {
        const item = transactions[i];
        const li = document.createElement('li');
        
        const displayWalletName = item.wallet.replace('_', ' '); 
        const isIncome = item.type === 'income';
        
        li.innerHTML = `
            <div class="tx-info">
                <span class="badge badge-${item.wallet.toLowerCase()}">${displayWalletName}</span>
                <span>${item.name}</span>
            </div>
            <span class="${isIncome ? 'amt-income' : 'amt-expense'}">
                ${isIncome ? '+' : '-'}$${item.amount.toFixed(2)}
            </span>
        `;
        historyList.appendChild(li);
    }
}
