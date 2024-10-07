// deckbuilder.js

// Register the Service Worker for PWA functionality
// ... existing service worker registration ...

let currentDeck = [];    // Generated deck
let currentIndex = -1;   // Current card index (-1 to start with back.jpg)
let allGames = [];       // List of all games/expansions
let selectedGames = [];  // Selected games/expansions
let dataStore = {};      // Map expansions to arrays of cards
let availableCards = []; // Global array of available cards (cards from selected expansions)
let allCardTypes = [];   // List of all card types
let selectedCardTypes = []; // Selected card types

// Enable dark mode by default
document.body.classList.add('dark-mode');

// Fetch the JSON file and load the data
fetch('cards.json')
    .then(response => response.json())
    .then(cardsData => {
        // Process data
        dataStore = {};

        cardsData.forEach(card => {
            let expansion = card['EXPANSION'];
            if (!dataStore[expansion]) {
                dataStore[expansion] = [];
            }
            dataStore[expansion].push(card);
        });

        // Get all games (expansions)
        allGames = Object.keys(dataStore);

        // Generate game selection checkboxes
        generateGameSelection(allGames);

        // Load configuration if available (restore selected games)
        loadConfiguration(); // This will set selectedGames

        // After loading configuration, proceed to load available cards
        loadAvailableCards();

        // Generate card type selection checkboxes based on available cards
        generateCardTypeSelection();

        // Event listener for game selection changes
        document.getElementById('gameCheckboxes').addEventListener('change', (event) => {
            if (event.target && event.target.matches('input[type="checkbox"]')) {
                loadAvailableCards();
                generateCardTypeSelection();
                saveConfiguration(); // Automatically save configuration when games are selected/deselected
            }
        });

        // Event listener for card type selection changes
        document.getElementById('cardTypeCheckboxes').addEventListener('change', (event) => {
            if (event.target && event.target.matches('input[type="checkbox"]')) {
                saveConfiguration(); // Automatically save configuration when card types are selected/deselected
            }
        });

        // Enhance buttons after DOM content is loaded
        enhanceButtons();
    })
    .catch(error => console.error('Error loading the JSON file:', error));

// Function to generate game selection checkboxes
function generateGameSelection(games) {
    const gameCheckboxes = document.getElementById('gameCheckboxes');
    gameCheckboxes.innerHTML = ''; // Clear existing checkboxes
    games.forEach(game => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `game-${game}`;
        checkbox.value = game;
        checkbox.checked = true; // Default to checked
        checkbox.classList.add('form-check-input', 'mr-2');

        const label = document.createElement('label');
        label.htmlFor = `game-${game}`;
        label.textContent = game;
        label.classList.add('form-check-label');

        const div = document.createElement('div');
        div.classList.add('form-check');
        div.appendChild(checkbox);
        div.appendChild(label);

        gameCheckboxes.appendChild(div);
    });
}

// Function to generate card type selection checkboxes
function generateCardTypeSelection() {
    // Collect all card types from available cards
    let cardTypesSet = new Set();
    availableCards.forEach(card => {
        cardTypesSet.add(card.TYPE);
    });
    allCardTypes = Array.from(cardTypesSet).sort();

    const cardTypeCheckboxes = document.getElementById('cardTypeCheckboxes');
    cardTypeCheckboxes.innerHTML = ''; // Clear existing checkboxes
    allCardTypes.forEach(type => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `type-${type}`;
        checkbox.value = type;
        checkbox.checked = true; // Default to checked
        checkbox.classList.add('form-check-input', 'mr-2');

        const label = document.createElement('label');
        label.htmlFor = `type-${type}`;
        label.textContent = type;
        label.classList.add('form-check-label');

        const div = document.createElement('div');
        div.classList.add('form-check');
        div.appendChild(checkbox);
        div.appendChild(label);

        cardTypeCheckboxes.appendChild(div);
    });

    // Restore selected card types from configuration
    restoreCardTypeSelection();
}

// Function to load available cards based on selected games
function loadAvailableCards() {
    // Get selected games
    selectedGames = [];
    allGames.forEach(game => {
        const checkbox = document.getElementById(`game-${game}`);
        if (checkbox.checked) {
            selectedGames.push(game);
        }
    });

    // Flatten cards from selected games
    availableCards = [];
    selectedGames.forEach(game => {
        if (dataStore[game]) {
            availableCards = availableCards.concat(dataStore[game]);
        }
    });
}

// Save configuration function
function saveConfiguration() {
    // Get selected card types
    selectedCardTypes = [];
    allCardTypes.forEach(type => {
        const checkbox = document.getElementById(`type-${type}`);
        if (checkbox && checkbox.checked) {
            selectedCardTypes.push(type);
        }
    });

    const config = {
        selectedGames,
        selectedCardTypes
    };
    localStorage.setItem('savedConfig', JSON.stringify(config));
}

// Load configuration function
function loadConfiguration() {
    const savedConfig = JSON.parse(localStorage.getItem('savedConfig'));
    if (savedConfig) {
        // Restore game selections
        allGames.forEach(game => {
            const checkbox = document.getElementById(`game-${game}`);
            if (checkbox) {
                checkbox.checked = savedConfig.selectedGames.includes(game);
            }
        });

        // Set selectedGames based on restored game selections
        selectedGames = savedConfig.selectedGames;

        // Set selectedCardTypes for later use
        selectedCardTypes = savedConfig.selectedCardTypes || [];
    } else {
        // If no configuration, set selectedGames to all games
        selectedGames = allGames.slice();
        selectedCardTypes = [];
    }
}

// Restore card type selection from configuration
function restoreCardTypeSelection() {
    if (selectedCardTypes.length > 0) {
        allCardTypes.forEach(type => {
            const checkbox = document.getElementById(`type-${type}`);
            if (checkbox) {
                checkbox.checked = selectedCardTypes.includes(type);
            }
        });
    } else {
        // If no saved selection, default to all types selected
        selectedCardTypes = allCardTypes.slice();
    }
}

// Function to generate the deck
function generateDeck() {
    if (selectedGames.length === 0) {
        showToast('Please select at least one expansion.');
        return;
    }

    // Update selected card types
    selectedCardTypes = [];
    allCardTypes.forEach(type => {
        const checkbox = document.getElementById(`type-${type}`);
        if (checkbox && checkbox.checked) {
            selectedCardTypes.push(type);
        }
    });

    if (selectedCardTypes.length === 0) {
        showToast('Please select at least one card type.');
        return;
    }

    currentIndex = -1; // Start with -1 to display back.jpg first

    // Filter availableCards based on selected card types
    const filteredCards = availableCards.filter(card => selectedCardTypes.includes(card.TYPE));

    if (filteredCards.length === 0) {
        showToast('No cards available with the selected card types.');
        return;
    }

    // Shuffle filteredCards to create currentDeck
    currentDeck = shuffleDeck(filteredCards);

    // Save the current configuration
    saveConfiguration();

    displayDeck();

    // Show the Card Action section after deck generation
    document.getElementById('cardActionSection').style.display = 'block';

    // Collapse the "Select Expansions" and "Select Card Types" sections
    $('#gameCheckboxes').collapse('hide');
    $('#cardTypeCheckboxes').collapse('hide');
}

// Function to shuffle the deck
function shuffleDeck(deck) {
    let shuffledDeck = [...deck];
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    return shuffledDeck;
}

// Function to display the current card
function showCurrentCard() {
    const output = document.getElementById('deckOutput');
    output.style.opacity = 0; // Start with transparent

    setTimeout(() => {
        output.innerHTML = ''; // Clear previous content

        let contentHTML = '';

        if (currentIndex === -1) {
            // Display back.jpg
            contentHTML = `
                <div class="card-item">
                    <strong>Start the Game</strong><br>
                    <img src="cardimages/back.jpg" alt="Card Back" class="card-image img-fluid">
                </div>
            `;
        } else {
            const card = currentDeck[currentIndex];
            // Use the 'Content' field for the image filename
            contentHTML = `
                <div class="card-item">
                    <strong>${card['CARD NAME']}</strong>${card.TYPE ? ` (${card.TYPE})` : ''}<br>
                    <img src="cardimages/${card.Content}" alt="${card['CARD NAME']}" class="card-image img-fluid">
                </div>
            `;
        }

        output.innerHTML = contentHTML;

        // Update progress bar
        updateProgressBar();

        // Fade in
        output.style.opacity = 1;

        // Scroll the card display area into view
        output.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}

// Function to display the deck
function displayDeck() {
    const output = document.getElementById('deckOutput');
    output.innerHTML = ''; // Clear previous deck

    const navButtons = document.getElementById('navigationButtons');

    if (currentDeck.length === 0) {
        output.innerHTML = '<p>No cards selected.</p>';
        navButtons.style.display = 'none';
        document.getElementById('deckProgress').style.display = 'none';
    } else {
        navButtons.style.display = 'block';
        document.getElementById('deckProgress').style.display = 'block';
        showCurrentCard();
    }
}

// Function to update the progress bar
function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');

    if (currentDeck.length === 0) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        progressBar.textContent = 'No cards available';
        return;
    }

    let totalCards = currentDeck.length + 1; // Including the back card
    let currentCardNumber = Math.max(1, currentIndex + 2); // Ensure at least 1 for the back card

    let progressPercentage = (currentCardNumber / totalCards) * 100;

    progressBar.style.width = `${progressPercentage}%`;
    progressBar.setAttribute('aria-valuenow', progressPercentage.toFixed(0));

    progressBar.textContent = `Card ${currentCardNumber} of ${totalCards}`;
}

// Event listeners for navigation buttons
document.getElementById('prevCard').addEventListener('click', () => {
    if (currentIndex > -1) {
        currentIndex--;
        showCurrentCard();
    }
});

document.getElementById('nextCard').addEventListener('click', () => {
    if (currentIndex < currentDeck.length - 1) {
        currentIndex++;
        showCurrentCard();
    }
});

// Attach event listener to the generate button
document.getElementById('generateDeck').addEventListener('click', generateDeck);

// Function to show a toast message
function showToast(message) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.classList.add('toast', 'show');
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Function to enhance buttons with ripple effect and touch feedback
function enhanceButtons() {
    document.querySelectorAll('button').forEach(button => {
        // Handle the ripple effect on button click
        button.addEventListener('click', function (e) {
            // Touch feedback (vibration)
            if ('vibrate' in navigator) {
                navigator.vibrate(30);
            }

            // Create ripple
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            button.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });

        // Visual feedback for button press
        button.addEventListener('pointerdown', function () {
            button.classList.add('button-pressed');
        });

        button.addEventListener('pointerup', function () {
            button.classList.remove('button-pressed');
        });

        button.addEventListener('pointerleave', function () {
            button.classList.remove('button-pressed');
        });
    });
}

// Event listener for card action selection
document.getElementById('cardAction').addEventListener('change', (event) => {
    const cardAction = event.target.value;
    const actionTopNInput = document.getElementById('actionTopNInput');

    if (cardAction === 'shuffleTopN') {
        actionTopNInput.style.display = 'block'; // Show input
    } else {
        actionTopNInput.style.display = 'none'; // Hide input
    }
});

// Apply card action to the active card
document.getElementById('applyCardAction').addEventListener('click', () => {
    const cardAction = document.getElementById('cardAction').value;

    if (currentIndex === -1) {
        showToast('No active card to apply action.');
        return;
    }

    // The active card before any action
    const activeCard = currentDeck[currentIndex];

    console.log('Current Index:', currentIndex);
    console.log('Active Card Before Action:', activeCard);
    console.log('Current Deck Before Action:', currentDeck);

    if (cardAction === 'shuffleAnywhere') {
        // Remove the active card from the deck
        currentDeck.splice(currentIndex, 1);

        // Generate a random insertion index after the current index
        const insertionIndex = Math.floor(Math.random() * (currentDeck.length - currentIndex)) + currentIndex + 1;

        // Insert the card back into the deck
        currentDeck.splice(insertionIndex, 0, activeCard);

        showToast('Card shuffled back into the deck.');

        // Move to the previous card
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            currentIndex = -1; // Go back to the start (back.jpg)
        }
    } else if (cardAction === 'shuffleTopN') {
        let topN = parseInt(document.getElementById('actionN').value);
        if (isNaN(topN) || topN <= 0) {
            showToast('Please enter a valid number for N.');
            return;
        }

        // Calculate the number of remaining cards after the current card
        const remainingCards = currentDeck.length - (currentIndex + 1);

        // Adjust topN if it exceeds the number of remaining cards
        if (topN > remainingCards) {
            topN = remainingCards;
            showToast(`Only ${remainingCards} cards remaining. Shuffling into the next ${remainingCards} cards.`);
        }

        if (topN > 0) {
            // Remove the active card from the deck
            currentDeck.splice(currentIndex, 1);

            // Calculate the insertion range starting from the next card
            const startRange = currentIndex + 1;
            const endRange = currentIndex + topN;

            // Generate a random insertion index within the specified range
            const insertionIndex = Math.floor(Math.random() * (endRange - startRange + 1)) + startRange;

            // Insert the card back into the deck
            currentDeck.splice(insertionIndex, 0, activeCard);

            showToast(`Card shuffled into the next ${topN} cards.`);
        } else {
            showToast('No remaining cards to shuffle into.');
        }

        // Move to the previous card
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            currentIndex = -1; // Go back to the start (back.jpg)
        }
    } else if (cardAction === 'replaceSameType') {
        replaceActiveCardWithUnseenSameType();
    } else {
        showToast('Please select a valid action.');
        return;
    }

    console.log('Current Deck After Action:', currentDeck);

    // Refresh the display
    showCurrentCard();
});

// Function to replace the active card with an unseen card of the same type
function replaceActiveCardWithUnseenSameType() {
    const activeCard = currentDeck[currentIndex];
    const activeCardType = activeCard.TYPE.trim().toLowerCase();

    console.log('Active Card:', activeCard);
    console.log('Active Card Type:', activeCardType);

    // Get all cards of the same type from availableCards
    const allSameTypeCards = availableCards.filter(card => {
        return card.TYPE.trim().toLowerCase() === activeCardType;
    });

    console.log('All Same Type Cards:', allSameTypeCards);

    // Exclude cards already in the currentDeck
    const selectedCardIds = new Set(currentDeck.map(card => card['CARD NAME'] + card.Content));
    const unseenSameTypeCards = allSameTypeCards.filter(card => {
        const cardId = card['CARD NAME'] + card.Content;
        return !selectedCardIds.has(cardId);
    });

    console.log('Unseen Same Type Cards:', unseenSameTypeCards);

    if (unseenSameTypeCards.length === 0) {
        showToast('No unseen cards of the same type are available.');
        return;
    }

    // Randomly select a new card from unseenSameTypeCards
    const randomIndex = Math.floor(Math.random() * unseenSameTypeCards.length);
    const newCard = unseenSameTypeCards[randomIndex];

    console.log('Selected New Card:', newCard);

    // Replace the active card with the new card in the currentDeck
    currentDeck[currentIndex] = newCard;

    showToast(`Replaced the active card with a new unseen card of the same type.`);
}