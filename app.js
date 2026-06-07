import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =========================================================================
// 1. FIREBASE SETUP (PASTE YOUR ACTUAL APP CREDENTIALS HERE)
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAU3Y4bIzWiGDUn4s0_efGebCahZQBmKv8",
  authDomain: "householdbudget-28f60.firebaseapp.com",
  databaseURL: "https://householdbudget-28f60-default-rtdb.asia-southeast1.firebasedatabase.app",
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
let balances = { ZKL_Kpay: 0, ZKL_Cash: 0, HYW_Kpay: 0, HYW_Cash: 0 };
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

const incomeWallet = document.getElementById('income-wallet');
const incomeName = document.getElementById('income-name');
const incomeAmount = document.getElementById('income-amount');
const addIncomeBtn = document.getElementById('add-income-btn');

const expenseWallet = document.getElementById('expense-wallet');
const expenseName = document.getElementById('expense-name');
const expenseAmount = document.getElementById('expense-amount');
const addExpenseBtn = document.getElementById('add-expense-btn');

const historyList = document.getElementById('history-list');
const clearAllBtn = document.getElementById('clear-all-btn');

// =========================================================================
// 4. REAL-TIME DATABASE SYNC LISTENER
// =========================================================================
onSnapshot(budgetDocRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        balances = data.balances || { ZKL_Kpay: 0, ZKL_Cash: 0, HYW_Kpay: 0, HYW_Cash: 0 };
        transactions = data.transactions || [];
    } else {
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

    if (type === 'income') updatedBalances[walletKey] += amountNum;
    else if (type === 'expense') updatedBalances[walletKey] -= amountNum;

    const newTx = {
        id: Date.now(), 
        type: type,
        wallet: walletKey,
        name: nameStr,
        amount: amountNum
    };

    try {
        await setDoc(budgetDocRef, {
            balances: updatedBalances,
            transactions: [...transactions, newTx]
        }, { merge: true });
    } catch (err) {
        console.error("Transaction failed:", err);
        alert("Failed to synchronize with database.");
    }
}

// FEATURE A: DELETE SINGLE TRANSACTION LOGIC
async function deleteTransaction(txId) {
    const txToDelete = transactions.find(t => t.id === txId);
    if (!txToDelete) return;

    const updatedBalances = { ...balances };
    // Revert balance modifications backwards
    if (txToDelete.type === 'income') {
        updatedBalances[txToDelete.wallet] -= txToDelete.amount;
    } else if (txToDelete.type === 'expense') {
        updatedBalances[txToDelete.wallet] += txToDelete.amount;
    }

    const updatedTransactions = transactions.filter(t => t.id !== txId);

    try {
        await setDoc(budgetDocRef, {
            balances: updatedBalances,
            transactions: updatedTransactions
        }, { merge: true });
    } catch (err) {
        console.error("Failed to delete item:", err);
        alert("Error updating database.");
    }
}

// FEATURE B: CLEAR ALL LOGIC
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to clear all history and reset balances to 0?")) {
            try {
                await setDoc(budgetDocRef, {
                    balances: { ZKL_Kpay: 0, ZKL_Cash: 0, HYW_Kpay: 0, HYW_Cash: 0 },
                    transactions: []
                });
            } catch (err) {
                alert("Clear failed.");
            }
        }
    });
}

addIncomeBtn.addEventListener('click', async () => {
    const wallet = incomeWallet.value;
    const name = incomeName.value.trim();
    const amount = parseFloat(incomeAmount.value);
    if (name === "" || isNaN(amount) || amount <= 0) return alert("Invalid inputs.");
    await handleTransaction('income', wallet, name, amount);
    incomeName.value = ""; incomeAmount.value = "";
});

addExpenseBtn.addEventListener('click', async () => {
    const wallet = expenseWallet.value;
    const name = expenseName.value.trim();
    const amount = parseFloat(expenseAmount.value);
    if (name === "" || isNaN(amount) || amount <= 0) return alert("Invalid inputs.");
    await handleTransaction('expense', wallet, name, amount);
    expenseName.value = ""; expenseAmount.value = "";
});

// =========================================================================
// 6. RENDER INTERFACE UI
// =========================================================================
function updateUI() {
    zklKpayDisplay.textContent = balances.ZKL_Kpay.toFixed(2);
    zklCashDisplay.textContent = balances.ZKL_Cash.toFixed(2);
    hywKpayDisplay.textContent = balances.HYW_Kpay.toFixed(2);
    hywCashDisplay.textContent = balances.HYW_Cash.toFixed(2);

    const combinedTotal = balances.ZKL_Kpay + balances.ZKL_Cash + balances.HYW_Kpay + balances.HYW_Cash;
    totalCombinedDisplay.textContent = combinedTotal.toFixed(2);

    balanceContainer.className = "balance";
    if (combinedTotal > 0) balanceContainer.classList.add("positive");
    else if (combinedTotal < 0) balanceContainer.classList.add("negative");
    else balanceContainer.classList.add("neutral");

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
            <div class="tx-right-side">
                <span class="${isIncome ? 'amt-income' : 'amt-expense'}">
                    ${isIncome ? '+' : '-'}${item.amount.toFixed(2)}
                </span>
                <button class="delete-tx-btn" data-id="${item.id}">×</button>
            </div>
        `;
        
        li.querySelector('.delete-tx-btn').addEventListener('click', (e) => {
            const idToDel = parseInt(e.target.getAttribute('data-id'));
            deleteTransaction(idToDel);
        });

        historyList.appendChild(li);
    }
}
