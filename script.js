// Card Data
const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = [
    { name: 'A', value: 1 },
    { name: '2', value: 2 },
    { name: '3', value: 3 },
    { name: '4', value: 4 },
    { name: '5', value: 5 },
    { name: '6', value: 6 },
    { name: '7', value: 7 },
    { name: '8', value: 8 },
    { name: '9', value: 9 },
    { name: '10', value: 10 },
    { name: 'J', value: 11 },
    { name: 'Q', value: 12 },
    { name: 'K', value: 13 }
];

// Game State
let currentCards = [];
let timerInterval;
let remainingTime = 60;
let isGameActive = false;

// DOM Elements
const cardsContainer = document.getElementById('cards-container');
const timerText = document.getElementById('timer-text');
const timerRing = document.getElementById('timer-ring');
const inputField = document.getElementById('solution-input');
const submitBtn = document.getElementById('submit-btn');
const messageArea = document.getElementById('message-area');
const newGameBtn = document.getElementById('new-game-btn');
const giveUpBtn = document.getElementById('give-up-btn');
const timerContainer = document.querySelector('.timer-container');

// Initialization
function init() {
    setupEventListeners();
    startNewRound();
}

function setupEventListeners() {
    submitBtn.addEventListener('click', handleSubmit);
    newGameBtn.addEventListener('click', startNewRound);
    giveUpBtn.addEventListener('click', () => showSolution(false));

    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
    });
}

// Game Logic
function startNewRound() {
    isGameActive = true;
    remainingTime = 60;
    inputField.value = '';
    inputField.disabled = false;
    submitBtn.disabled = false;
    messageArea.textContent = '';
    timerContainer.style.background = 'var(--card-bg)';

    // Clear timer
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(updateTimer, 1000);

    // Deal valid cards
    let solvable = false;
    let attempts = 0;
    while (!solvable && attempts < 100) {
        dealCards();
        const values = currentCards.map(c => c.value);
        const solution = solve24(values);
        if (solution) {
            solvable = true;
            console.log(`Solution found: ${solution}`); // Debug hint
        } else {
            console.log('Projected hand unsolvable, redrawing...');
        }
        attempts++;
    }

    renderCards();
    inputField.focus();
}

function dealCards() {
    currentCards = [];
    for (let i = 0; i < 4; i++) {
        const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)];
        currentCards.push({
            suit: randomSuit,
            name: randomRank.name,
            value: randomRank.value,
            color: (randomSuit === '♥' || randomSuit === '♦') ? 'red' : 'black'
        });
    }
}

function renderCards() {
    cardsContainer.innerHTML = '';
    currentCards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.color}`;
        cardEl.style.animationDelay = `${index * 0.1}s`;

        cardEl.innerHTML = `
            <div class="card-top">${card.name}${card.suit}</div>
            <div class="card-center">${card.name}</div>
            <div class="card-bottom">${card.name}${card.suit}</div>
        `;
        cardsContainer.appendChild(cardEl);
    });
}

// Timer
function updateTimer() {
    remainingTime--;
    updateTimerDisplay();

    if (remainingTime <= 10) {
        timerContainer.style.background = 'rgba(239, 68, 68, 0.2)';
    }

    if (remainingTime <= 0) {
        endRound(false, "Time's up!");
    }
}

function updateTimerDisplay() {
    timerText.textContent = remainingTime;
    // Simple ring animation could be CSS, but let's leave it static or simple for now
}

// Input Handling
function handleSubmit() {
    if (!isGameActive) return;

    const input = inputField.value.trim();
    if (!input) {
        showMessage('Please enter a formula', 'error');
        return;
    }

    // validate input characters (numbers, operators, parens, spaces)
    if (!/^[\d\+\-\*\/\(\)\s]+$/.test(input)) {
        showMessage('Invalid characters. Use numbers and + - * / ( )', 'error');
        return;
    }

    // Check if numbers match cards
    const numbersInInput = input.match(/\d+/g);
    if (!numbersInInput || numbersInInput.length !== 4) {
        showMessage('You must use exactly 4 numbers', 'error');
        return;
    }

    const inputValues = numbersInInput.map(Number).sort((a, b) => a - b);
    const cardValues = currentCards.map(c => c.value).sort((a, b) => a - b);

    // Deep equality check for sorted arrays
    const correctNumbers = inputValues.every((val, index) => val === cardValues[index]);

    if (!correctNumbers) {
        showMessage('You must use the exact numbers on the cards', 'error');
        return;
    }

    try {
        // Safe evaluation is relatively safe here due to regex check above
        // However, we need to handle potential division by zero or weird syntax
        // Function constructor is a safer eval alternative, but with regex check eval is acceptable in this closed scope
        const result = Function('"use strict";return (' + input + ')')();

        if (Math.abs(result - 24) < 0.0001) {
            endRound(true, 'Correct! 🎉');
        } else {
            showMessage(`Result is ${Number(result.toFixed(2))}, not 24. Try again!`, 'error');
        }
    } catch (e) {
        showMessage('Invalid math formula', 'error');
    }
}

function showMessage(text, type) {
    messageArea.textContent = text;
    messageArea.className = `message-area message-${type}`;
    // animation logic could go here
    setTimeout(() => {
        messageArea.style.opacity = '1';
    }, 10);
}

function endRound(success, message) {
    isGameActive = false;
    clearInterval(timerInterval);
    inputField.disabled = true;
    submitBtn.disabled = true;

    if (success) {
        showMessage(message, 'success');
        // trigger confetti or happy animation?
    } else {
        showMessage(message, 'error');
        showSolution(true); // show solution automatically on timeout
    }
}

function showSolution(fromTimeout = false) {
    if (!isGameActive && !fromTimeout) return;

    if (!fromTimeout) {
        // User clicked "Give Up"
        isGameActive = false;
        clearInterval(timerInterval);
        inputField.disabled = true;
        submitBtn.disabled = true;
        showMessage('You gave up.', 'info');
    }

    const values = currentCards.map(c => c.value);
    const solution = solve24(values);

    const solutionDiv = document.createElement('div');
    solutionDiv.style.marginTop = '1rem';
    solutionDiv.style.color = 'var(--text-primary)';
    solutionDiv.innerHTML = `Possible solution: <strong>${solution}</strong>`;
    messageArea.appendChild(solutionDiv);
}

// 24 Solver
// Brute force all permutations and operator combinations
function solve24(nums) {
    if (nums.length !== 4) return null;

    const ops = ['+', '-', '*', '/'];
    const permutations = getPermutations(nums);

    for (let p of permutations) {
        // 4 numbers means 3 operators
        // We also need to consider parentheses/grouping
        // 5 pattern templates for (a,b,c,d):
        // 1. ((a op b) op c) op d
        // 2. (a op (b op c)) op d
        // 3. a op ((b op c) op d)
        // 4. a op (b op (c op d))
        // 5. (a op b) op (c op d)

        for (let op1 of ops) {
            for (let op2 of ops) {
                for (let op3 of ops) {
                    const expressions = [
                        `(({0} ${op1} {1}) ${op2} {2}) ${op3} {3}`,
                        `({0} ${op1} ({1} ${op2} {2})) ${op3} {3}`,
                        `{0} ${op1} (({1} ${op2} {2}) ${op3} {3})`,
                        `{0} ${op1} ({1} ${op2} ({2} ${op3} {3}))`,
                        `({0} ${op1} {1}) ${op2} ({2} ${op3} {3})`
                    ];

                    for (let expr of expressions) {
                        const filled = expr
                            .replace('{0}', p[0])
                            .replace('{1}', p[1])
                            .replace('{2}', p[2])
                            .replace('{3}', p[3]);

                        try {
                            const res = eval(filled);
                            if (Math.abs(res - 24) < 0.0001) {
                                return filled;
                            }
                        } catch (e) {
                            // division by zero etc
                        }
                    }
                }
            }
        }
    }
    return null;
}

function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    let output = [];
    for (let i = 0; i < arr.length; i++) {
        const current = arr.slice();
        const element = current.splice(i, 1)[0];
        const remaining = getPermutations(current);
        for (let j = 0; j < remaining.length; j++) {
            output.push([element].concat(remaining[j]));
        }
    }
    return output;
}

// Start
init();
