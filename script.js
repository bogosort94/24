// No change needed logically, just confirming state.
// Actually, I'll update the walkthrough to mention the fix.
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
let cardsOnBoard = []; // Array of card objects
let initialLevelValues = []; // Store original 4 values
let isDragging = false;
let draggedCardId = null;
let dragOffset = { x: 0, y: 0 };
let dragStartPos = { x: 0, y: 0 }; // For threshold check
let currentDragElement = null;
let mergeCandidate = null; // { sourceId, targetId }

let timerInterval;
let remainingTime = 60;
let isGameActive = false;

// DOM Elements
const cardsContainer = document.getElementById('cards-container');
const timerText = document.getElementById('timer-text');
const messageArea = document.getElementById('message-area');
const newGameBtn = document.getElementById('new-game-btn');
const giveUpBtn = document.getElementById('give-up-btn');
const timerContainer = document.querySelector('.timer-container');

// Modal Elements
const operatorModal = document.getElementById('operator-modal');
const cancelMergeBtn = document.getElementById('cancel-merge-btn');
const opButtons = document.querySelectorAll('.op-btn');

// Initialization
function init() {
    setupEventListeners();
    startNewRound();
}

function setupEventListeners() {
    newGameBtn.addEventListener('click', startNewRound);
    giveUpBtn.addEventListener('click', handleGiveUp);
    cancelMergeBtn.addEventListener('click', closeModal);

    opButtons.forEach(btn => {
        btn.addEventListener('click', handleOpClick);
    });

    // Global pointer up to catch drops anywhere
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointermove', handlePointerMove);
}

function handleOpClick(e) {
    if (!mergeCandidate) return;

    const op = e.currentTarget.dataset.op;
    const sourceCard = cardsOnBoard.find(c => c.id === mergeCandidate.sourceId);
    const targetCard = cardsOnBoard.find(c => c.id === mergeCandidate.targetId);

    if (!sourceCard || !targetCard) {
        closeModal();
        return;
    }

    const valA = sourceCard.value;
    const valB = targetCard.value;
    let result = null;

    switch (op) {
        case '+': result = valA + valB; break;
        case '-': result = valA - valB; break;
        case '*': result = valA * valB; break;
        case '/':
            if (valB === 0) {
                showMessage("Cannot divide by zero!", 'error');
                return;
            }
            result = valA / valB;
            break;
    }

    if (result !== null) {
        confirmMerge(result, sourceCard, targetCard);
    }
}

// Data Handling logic
function createCardId() {
    return 'card-' + Math.random().toString(36).substr(2, 9);
}

function startNewRound() {
    isGameActive = true;
    remainingTime = 60;
    messageArea.textContent = '';
    messageArea.className = 'message-area';
    timerContainer.style.background = 'var(--card-bg)';

    // Reset Timer
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(updateTimer, 1000);

    // Deal Deal Deal
    let solvable = false;
    let attempts = 0;
    while (!solvable && attempts < 100) {
        dealCards();
        const values = cardsOnBoard.map(c => c.value);
        const solution = solve24(values);
        if (solution) {
            solvable = true;
            console.log(`Hint: ${solution}`);
            initialLevelValues = [...values]; // Store copy
        }
        attempts++;
    }

    renderCards();
}

function dealCards() {
    cardsOnBoard = [];
    for (let i = 0; i < 4; i++) {
        const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)];
        cardsOnBoard.push({
            id: createCardId(),
            value: randomRank.value,
            text: randomRank.name,
            suit: randomSuit,
            color: (randomSuit === '♥' || randomSuit === '♦') ? 'red' : 'black',
            subText: randomRank.name + randomSuit,
            type: 'original',
            x: 0,
            y: 0 // Relative positions can be handled by CSS layout initially, but absolute for drag needs management
        });
    }
}

// Rendering
function renderCards() {
    cardsContainer.innerHTML = '';
    cardsOnBoard.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.color} ${card.type === 'merged' ? 'merged' : ''}`;
        cardEl.id = card.id;
        cardEl.dataset.id = card.id;

        // Content
        if (card.type === 'original') {
            cardEl.innerHTML = `
                <div class="card-top">${card.subText}</div>
                <div class="card-center">${card.text}</div>
                <div class="card-bottom">${card.subText}</div>
            `;
        } else {
            // Merged Card
            cardEl.innerHTML = `
                <div class="card-center">${Math.round(card.value * 100) / 100}</div>
            `;
        }

        // Event Listeners for Interaction
        cardEl.addEventListener('pointerdown', handlePointerDown);
        cardEl.addEventListener('dblclick', handleDoubleClick);

        cardsContainer.appendChild(cardEl);
    });
}

// Interaction Logic
function handlePointerDown(e) {
    if (!isGameActive) return;

    const cardEl = e.currentTarget;
    const cardId = cardEl.dataset.id;

    // Prepare for drag, but wait for threshold
    isDragging = false;
    draggedCardId = cardId;
    currentDragElement = cardEl;

    dragStartPos = { x: e.clientX, y: e.clientY };

    // Calculate offset relative to card
    const rect = cardEl.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    // Pointer capture (important so we keep tracking even if mouse leaves element)
    cardEl.setPointerCapture(e.pointerId);
}

function startDrag(e) {
    isDragging = true;
    const cardEl = currentDragElement;

    // Create and insert placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'card ghost';
    placeholder.id = 'drag-placeholder';
    cardEl.parentNode.insertBefore(placeholder, cardEl);

    // Move to body to avoid transform/perspective context issues
    document.body.appendChild(cardEl);

    // Set absolute positioning for dragging
    // Initialize at current pointer - offset
    cardEl.style.position = 'fixed';
    cardEl.style.left = (e.clientX - dragOffset.x) + 'px';
    cardEl.style.top = (e.clientY - dragOffset.y) + 'px';
    cardEl.style.zIndex = 1000;
    cardEl.style.transform = 'scale(1.05) rotate(0deg)'; // Remove hover rotation
    cardEl.style.transition = 'none'; // DISABLE TRANSITION FOR INSTANT TRACKING
}

function handlePointerMove(e) {
    if (!currentDragElement) return;

    if (!isDragging) {
        // Check threshold
        const dx = e.clientX - dragStartPos.x;
        const dy = e.clientY - dragStartPos.y;
        if (Math.hypot(dx, dy) > 5) { // 5px threshold
            startDrag(e);
        }
    }

    if (isDragging) {
        e.preventDefault();
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;

        currentDragElement.style.left = x + 'px';
        currentDragElement.style.top = y + 'px';
    }
}

function handlePointerUp(e) {
    if (!currentDragElement) return;

    const draggedEl = currentDragElement;
    const draggedId = draggedCardId;

    // Release capture
    draggedEl.releasePointerCapture(e.pointerId);

    if (!isDragging) {
        // It was just a click (did not exceed threshold)
        // Cleanup and return, letting click/dblclick fire natively
        currentDragElement = null;
        draggedCardId = null;
        return;
    }

    isDragging = false;
    draggedCardId = null;
    currentDragElement = null;

    // Check overlap with other cards
    const droppedRect = draggedEl.getBoundingClientRect();
    let targetId = null;
    let maxOverlapArea = 0;

    cardsOnBoard.forEach(card => {
        if (card.id === draggedId) return;

        const targetEl = document.getElementById(card.id);
        if (!targetEl) return;

        const targetRect = targetEl.getBoundingClientRect();

        const intersection = getIntersection(droppedRect, targetRect);
        if (intersection > maxOverlapArea && intersection > (targetRect.width * targetRect.height * 0.3)) {
            // Must overlap at least 30%
            maxOverlapArea = intersection;
            targetId = card.id;
        }
    });

    if (targetId) {
        initiateMerge(draggedId, targetId, draggedEl);
    } else {
        // Snap back to placeholder
        snapBack(draggedEl);
    }
}

function snapBack(draggedEl) {
    const placeholder = document.getElementById('drag-placeholder');
    if (!placeholder) {
        // Fallback if no placeholder
        resetCardStyles(draggedEl);
        renderCards(); // Safety re-render
        return;
    }

    const rect = placeholder.getBoundingClientRect();

    draggedEl.style.transition = 'all 0.2s ease-out';
    draggedEl.style.left = rect.left + 'px';
    draggedEl.style.top = rect.top + 'px';
    draggedEl.style.transform = 'scale(1)';

    // Wait for transition, then put back in flow
    draggedEl.addEventListener('transitionend', () => {
        if (placeholder.parentNode) {
            placeholder.replaceWith(draggedEl);
        }
        resetCardStyles(draggedEl);
    }, { once: true });
}

function resetCardStyles(el) {
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.zIndex = '';
    el.style.transform = '';
    el.style.transition = '';
    // ensure placeholder is gone if still there
    const placeholder = document.getElementById('drag-placeholder');
    if (placeholder) placeholder.remove();
}

// Helper Functions
function getIntersection(r1, r2) {
    const xOverlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
    const yOverlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
    return xOverlap * yOverlap;
}

// Merge Logic
function initiateMerge(sourceId, targetId, cardEl) {
    const sourceCard = cardsOnBoard.find(c => c.id === sourceId);
    const targetCard = cardsOnBoard.find(c => c.id === targetId);

    mergeCandidate = { sourceId, targetId, cardElement: cardEl };

    // Show Modal
    showOperatorModal();
}

function showOperatorModal() {
    if (!mergeCandidate) return;
    const source = cardsOnBoard.find(c => c.id === mergeCandidate.sourceId);
    const target = cardsOnBoard.find(c => c.id === mergeCandidate.targetId);
    if (!source || !target) return;

    const valA = source.value;
    const valB = target.value;

    const updateBtn = (id, symbol, val) => {
        const btn = document.getElementById(id);
        const displayVal = Number.isInteger(val) ? val : Number(val.toFixed(2));
        btn.innerHTML = `<span class="op-symbol">${symbol}</span><span class="op-result">${displayVal}</span>`;
    };

    updateBtn('op-add', '+', valA + valB);
    updateBtn('op-sub', '−', valA - valB);
    updateBtn('op-mul', '×', valA * valB);

    const divBtn = document.getElementById('op-div');
    if (Math.abs(valB) < 1e-9) { // Float safety check for zero
        divBtn.style.display = 'none';
    } else {
        divBtn.style.display = 'flex';
        updateBtn('op-div', '÷', valA / valB);
    }

    operatorModal.classList.remove('hidden');
}

function closeModal() {
    operatorModal.classList.add('hidden');
    // Cleanup floating card if exists
    if (mergeCandidate && mergeCandidate.cardElement && mergeCandidate.cardElement.parentNode === document.body) {
        mergeCandidate.cardElement.remove();
    }
    renderCards(); // Reset positions of dragged card (will respawn it in container)
    mergeCandidate = null;
}

function confirmMerge(resultValue, cardA, cardB) {
    // Cleanup floating card if exists
    if (mergeCandidate && mergeCandidate.cardElement && mergeCandidate.cardElement.parentNode === document.body) {
        mergeCandidate.cardElement.remove();
    }

    // Determine which card should stay or if we create a new one
    // Remove A and B, add new Card C

    cardsOnBoard = cardsOnBoard.filter(c => c.id !== cardA.id && c.id !== cardB.id);

    const newCard = {
        id: createCardId(),
        value: resultValue,
        text: Number(resultValue.toFixed(2)),
        subText: '',
        color: 'black', // Merged cards don't have suit color
        type: 'merged',
        parents: [cardA, cardB] // Save state for undo
    };

    cardsOnBoard.push(newCard);
    closeModal(); // This calls renderCards which updates UI
    checkWinCondition();
}

// Undo Logic
function handleDoubleClick(e) {
    if (!isGameActive) return;

    const cardId = e.currentTarget.dataset.id;
    const card = cardsOnBoard.find(c => c.id === cardId);

    if (card && card.type === 'merged' && card.parents) {
        // Undo merge
        cardsOnBoard = cardsOnBoard.filter(c => c.id !== cardId);
        cardsOnBoard.push(...card.parents);
        renderCards();
    }
}

// Win Logic
function checkWinCondition() {
    if (cardsOnBoard.length === 1) {
        const finalValue = cardsOnBoard[0].value;
        if (Math.abs(finalValue - 24) < 0.001) {
            endRound(true, 'Correct! 🎉 You made 24!');
        } else {
            // Not 24, user will probably undo or restart
            // showMessage(`Result is ${finalValue}, not 24.`, 'info'); 
            // Don't end round, let them undo
        }
    }
}

function handleGiveUp() {
    if (!isGameActive) return;
    endRound(false, "You gave up.");
    showSolution();
}

function endRound(success, message) {
    isGameActive = false;
    clearInterval(timerInterval);
    if (success) {
        showMessage(message, 'success');
        timerContainer.style.background = 'var(--accent-success)';
    } else {
        // showMessage(message, 'error');
    }
}

// Utility
function showMessage(text, type) {
    messageArea.textContent = text;
    messageArea.className = `message-area message-${type}`;
}

function updateTimer() {
    remainingTime--;
    updateTimerDisplay();
    if (remainingTime <= 10) {
        timerContainer.style.background = 'rgba(239, 68, 68, 0.2)';
    }
    if (remainingTime <= 0) {
        endRound(false, "Time's up!");
        showSolution();
    }
}

function updateTimerDisplay() {
    timerText.textContent = remainingTime;
}

function showSolution() {
    // Solve using the ORIGINAL 4 values
    if (!initialLevelValues || initialLevelValues.length !== 4) {
        console.error("No initial values found");
        return;
    }

    const solution = solve24(initialLevelValues);

    const div = document.createElement('div');
    div.style.marginTop = '1rem';
    div.innerHTML = solution ? `Solution for original cards: <strong>${solution}</strong>` : 'No solution found for original cards.';
    messageArea.appendChild(div);
}



// Restoring the original brute force for 4 cards for the initial deal check
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

function solve24(nums) {
    if (nums.length !== 4) return "Solution available for 4 cards only";

    // ... Copy paste previous solver logic or simplified one ...
    const ops = ['+', '-', '*', '/'];
    const permutations = getPermutations(nums);

    for (let p of permutations) {
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
                            const res = Function('"use strict";return (' + filled + ')')();
                            if (Math.abs(res - 24) < 0.0001) {
                                return filled;
                            }
                        } catch (e) { }
                    }
                }
            }
        }
    }
    return null;
}

init();
