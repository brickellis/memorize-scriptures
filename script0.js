let flashcardData = null;
let sessionState = {
    selectedCards: [],
    remainingCards: [],
    knownCards: [],
    unknownCards: [],
    isFlipped: false,
    sessionActive: false,
    startTime: null,
    shuffleEnabled: false
};

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('shuffle-toggle').checked = sessionState.shuffleEnabled;
    document.getElementById('shuffle-toggle').addEventListener('change', function () {
        sessionState.shuffleEnabled = this.checked;
    });
    setupEventListeners();
    loadFlashcardsFromGitHub();
});

function renderSelectionTree() {
    const tree = document.getElementById('selection-tree');
    tree.innerHTML = '';
    tree.style.display = 'block';

    for (const [categoryId, category] of Object.entries(flashcardData.categories)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';

        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';

        const categoryCheckbox = document.createElement('div');
        categoryCheckbox.className = 'checkbox-item';
        categoryCheckbox.innerHTML = `
                    <input type="checkbox" id="cat-${categoryId}" onchange="toggleCategory('${categoryId}')">
                    <label for="cat-${categoryId}">${category.name}</label>
                    <span class="card-count">(${getTotalCards(category)} cards)</span>
                `;

        categoryHeader.appendChild(categoryCheckbox);
        categoryDiv.appendChild(categoryHeader);

        if (category.subcategories) {
            for (const [subId, subcategory] of Object.entries(category.subcategories)) {
                const subDiv = document.createElement('div');
                subDiv.className = 'subcategory';
                subDiv.innerHTML = `
                            <div class="checkbox-item">
                                <input type="checkbox" id="sub-${categoryId}-${subId}" onchange="updateSelectionCount()">
                                <label for="sub-${categoryId}-${subId}">${subcategory.name}</label>
                                <span class="card-count">(${subcategory.cards ? subcategory.cards.length : 0} cards)</span>
                            </div>
                        `;
                categoryDiv.appendChild(subDiv);
            }
        }
        tree.appendChild(categoryDiv);
    }
}

function startSession() {
    const selectedCards = [];
    const startIndex = parseInt(document.getElementById('start-index').value) || 1;
    const stopIndex = parseInt(document.getElementById('stop-index').value);
    const skipInterval = parseInt(document.getElementById('skip-interval').value) || 1;

    if (stopIndex && startIndex > stopIndex) {
        showError('Please enter valid start and stop indices (start must be ≤ stop)');
        return;
    }
    if (startIndex < 1 || skipInterval < 1) {
        showError('Start index and skip interval must be at least 1');
        return;
    }

    for (const [categoryId, category] of Object.entries(flashcardData.categories)) {
        if (category.subcategories) {
            for (const [subId, subcategory] of Object.entries(category.subcategories)) {
                const checkbox = document.getElementById(`sub-${categoryId}-${subId}`);
                if (checkbox && checkbox.checked && subcategory.cards) {
                    const rangeCards = getCardsWithRange(subcategory.cards, startIndex, stopIndex, skipInterval);
                    selectedCards.push(...rangeCards);
                }
            }
        }
    }

    if (selectedCards.length === 0) {
        showError('Please select at least one category');
        return;
    }

    sessionState.selectedCards = selectedCards;

    setSessionState();
    showScreen('session-screen');
    displayCurrentCard();
}