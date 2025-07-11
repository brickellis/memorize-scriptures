async function loadFlashcardsFromGitHub() {
    const errorMsg = document.getElementById('error-msg');

    try {
        errorMsg.style.display = 'none';

        const response = await fetch('./flashcards.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        flashcardData = data;
        renderSelectionTree();

    } catch (error) {
        console.error('Error loading flashcards.json:', error);
        showError('Failed to load flashcards.json: ' + error.message + '. You can manually enter JSON data above.');
    }
}

function setupEventListeners() {
    document.addEventListener('keydown', function (e) {
        if (sessionState.sessionActive) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                markCard(false);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                markCard(true);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                flipCard();
            } else if (e.key === ' ') {
                e.preventDefault();
                restartSession();
            }
        }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    const flashcard = document.getElementById('flashcard');

    flashcard.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    flashcard.addEventListener('touchend', function (e) {
        if (!sessionState.sessionActive) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            e.preventDefault();
            if (diffX > 0) {
                markCard(true);
            } else {
                markCard(false);
            }
        }
    });
}

function getTotalCards(category) {
    let total = 0;
    if (category.subcategories) {
        for (const sub of Object.values(category.subcategories)) {
            total += sub.cards ? sub.cards.length : 0;
        }
    }
    return total;
}

function toggleCategory(categoryId) {
    const categoryCheckbox = document.getElementById(`cat-${categoryId}`);
    const isChecked = categoryCheckbox.checked;
    const category = flashcardData.categories[categoryId];
    if (category.subcategories) {
        for (const subId of Object.keys(category.subcategories)) {
            const subCheckbox = document.getElementById(`sub-${categoryId}-${subId}`);
            subCheckbox.checked = isChecked;
        }
    }
    updateSelectionCount();
}

function updateSelectionCount() {
    const checkboxes = document.querySelectorAll('#selection-tree input[type="checkbox"][id^="sub-"]');
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = selectedCount === 0;
    for (const [categoryId, category] of Object.entries(flashcardData.categories)) {
        const categoryCheckbox = document.getElementById(`cat-${categoryId}`);
        if (category.subcategories) {
            const subCheckboxes = Object.keys(category.subcategories).map(subId =>
                document.getElementById(`sub-${categoryId}-${subId}`)
            );
            const checkedSubs = subCheckboxes.filter(cb => cb.checked).length;

            if (checkedSubs === 0) {
                categoryCheckbox.checked = false;
                categoryCheckbox.indeterminate = false;
            } else if (checkedSubs === subCheckboxes.length) {
                categoryCheckbox.checked = true;
                categoryCheckbox.indeterminate = false;
            } else {
                categoryCheckbox.checked = false;
                categoryCheckbox.indeterminate = true;
            }
        }
    }
}

function selectAll() {
    const checkboxes = document.querySelectorAll('#selection-tree input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    updateSelectionCount();
}

function clearAll() {
    const checkboxes = document.querySelectorAll('#selection-tree input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectionCount();
}

function setSessionState(fullRestart = true) {

    if (fullRestart) sessionState.remainingCards = sessionState.shuffleEnabled ? shuffleArray([...sessionState.selectedCards]) : [...sessionState.selectedCards];
    else sessionState.remainingCards = sessionState.shuffleEnabled ? shuffleArray([...sessionState.unknownCards]) : [...sessionState.unknownCards];

    sessionState.isFlipped = false;
    sessionState.sessionActive = true;
    sessionState.startTime = Date.now();
    sessionState.knownCards = [];
    sessionState.unknownCards = [];
}

function flipCard() {
    if (!sessionState.sessionActive) return;

    const cardFront = document.getElementById('card-front');
    const cardBack = document.getElementById('card-back');

    sessionState.isFlipped = !sessionState.isFlipped;

    if (sessionState.isFlipped) {
        cardFront.classList.remove('active');
        cardBack.classList.add('active');
    } else {
        cardFront.classList.add('active');
        cardBack.classList.remove('active');
    }
}

function markCard(known) {
    if (!sessionState.sessionActive) return;

    const currentCard = sessionState.remainingCards.shift();

    if (known) {
        sessionState.knownCards.push(currentCard);
    } else {
        sessionState.unknownCards.push(currentCard);
        sessionState.remainingCards.push(currentCard);
    }

    if (sessionState.remainingCards.length === 0) {
        completeSession();
        return;
    }

    displayCurrentCard();
}

function completeSession() {
    sessionState.sessionActive = false;

    const sessionTime = Math.floor((Date.now() - sessionState.startTime) / 1000 / 60);
    document.getElementById('known-count').textContent = sessionState.knownCards.length;
    sessionState.unknownCards = Array.from(new Set(sessionState.unknownCards));
    console.log('Unknown Cards:', sessionState.unknownCards);
    document.getElementById('unknown-count').textContent = sessionState.unknownCards.length;
    document.getElementById('session-time').textContent = sessionTime + 'm';

    const continueBtn = document.getElementById('continue-btn');
    continueBtn.style.display = sessionState.unknownCards.length > 0 ? 'block' : 'none';

    showScreen('results-screen');
}

function continueWithMissed() {
    if (sessionState.unknownCards.length === 0) return;

    setSessionState(false);
    showScreen('session-screen');
    displayCurrentCard();
}

function restartSession() {
    setSessionState();
    showScreen('session-screen');
    displayCurrentCard();
}

function backToSelection() {
    showScreen('selection-screen');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showError(message) {
    const errorMsg = document.getElementById('error-msg');
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function displayCurrentCard() {
    const currentCard = sessionState.remainingCards[0];
    const progress = document.getElementById('progress');
    const cardFront = document.getElementById('card-front').querySelector('.card-content');
    const cardBack = document.getElementById('card-back').querySelector('.card-content');

    progress.textContent = `${sessionState.remainingCards.length} Cards Remaining`;
    cardFront.textContent = currentCard.front;
    cardBack.textContent = currentCard.back;

    sessionState.isFlipped = false;
    document.getElementById('card-front').classList.add('active');
    document.getElementById('card-back').classList.remove('active');
}

function getCardsWithRange(cards, startIndex, stopIndex, maxSize, skipInterval) {
    const selectedCards = [];
    const totalCards = cards.length;
    if (!stopIndex) stopIndex = totalCards + 100;
    if (!maxSize) maxSize = totalCards + 100;

    let currentIndex = startIndex - 1;

    while (currentIndex < totalCards && currentIndex < stopIndex && selectedCards.length < maxSize) {
        selectedCards.push(cards[currentIndex]);
        currentIndex += skipInterval;
    }

    return selectedCards;
}

function addMax() {
    const maxSizeInput = document.getElementById('max-size');
    const maxSizeValue = parseInt(maxSizeInput.value) || 0;

    const startIndexInput = document.getElementById('start-index');
    const startIndexValue = parseInt(startIndexInput.value) || 1;

    const newStartIndex = startIndexValue + maxSizeValue;
    startIndexInput.value = newStartIndex;
}