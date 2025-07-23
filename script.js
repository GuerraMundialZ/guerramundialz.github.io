document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded en script.js'); // Debugging line 1

    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com'; // Make sure this URL is correct

    // Import Socket.IO
    // Make sure to add <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script> in your subastas.html
    // This line is CRITICAL for Socket.IO to work and the rest of the script not to fail!
    const socket = io(BACKEND_URL); // Connect to the Socket.IO server
    console.log('Socket.IO connected:', socket); // Debugging line 2

    // References to DOM elements (authentication)
    const loginButton = document.getElementById('login-button');
    console.log('Element loginButton:', loginButton); // Debugging line 3

    const logoutButton = document.getElementById('logout-button');
    const userDisplay = document.getElementById('user-display');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const adminPanelBtnNav = document.getElementById('admin-panel-btn-nav');

    // References for the active auctions section (subastas.html)
    const activeAuctionsList = document.getElementById('active-auctions-list');
    const noAuctionsMessage = document.getElementById('no-auctions-message');
    const auctionsLoadingMessage = document.getElementById('auctions-loading-message');
    const auctionsErrorMessage = document.getElementById('auctions-error-message');

    // References for the bid message modal
    const bidMessageModal = document.getElementById('bid-message-modal');
    const bidModalTitle = document.getElementById('bid-modal-title');
    const bidModalMessage = document.getElementById('bid-modal-message');
    const bidModalCloseBtn = document.getElementById('bid-modal-close-btn');

    // Object to store countdown intervals for each auction
    const countdownIntervals = {};

    // Function to get the Discord authentication token from localStorage
    function getAuthToken() {
        return localStorage.getItem('discord_token');
    }

    // Function to save the Discord authentication token to localStorage
    function saveAuthToken(token) {
        localStorage.setItem('discord_token', token);
    }

    // Function to remove the Discord authentication token from localStorage
    function removeAuthToken() {
        localStorage.removeItem('discord_token');
    }

    // Function to show a modal message
    function showModalMessage(title, message, type) {
        bidModalTitle.textContent = title;
        bidModalMessage.textContent = message;
        bidMessageModal.style.display = 'block';

        // Apply styles based on message type
        bidModalTitle.className = ''; // Reset classes
        bidModalMessage.className = ''; // Reset classes
        if (type === 'success') {
            bidModalTitle.classList.add('success-text');
        } else if (type === 'error') {
            bidModalTitle.classList.add('error-text');
        } else if (type === 'info') {
            bidModalTitle.classList.add('info-text');
        }
    }

    // Close bid message modal
    if (bidModalCloseBtn) {
        bidModalCloseBtn.addEventListener('click', () => {
            bidMessageModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === bidMessageModal) {
            bidMessageModal.style.display = 'none';
        }
    });

    // Function to update the authentication UI
    async function updateAuthUI() {
        const token = getAuthToken();
        if (token) {
            try {
                const response = await fetch(`${BACKEND_URL}/api/auth/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const user = await response.json();
                    userName.textContent = user.username;
                    userAvatar.src = user.avatarUrl;
                    userDisplay.style.display = 'flex';
                    loginButton.style.display = 'none';
                    logoutButton.style.display = 'block';

                    // Show admin panel button if the user is an admin
                    if (user.isAdmin) {
                        adminPanelBtnNav.style.display = 'block';
                    } else {
                        adminPanelBtnNav.style.display = 'none';
                    }
                } else {
                    console.error('Failed to fetch user data:', response.statusText);
                    logoutUser(); // Log out if token is invalid
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                logoutUser(); // Log out on network error
            }
        } else {
            userDisplay.style.display = 'none';
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
            adminPanelBtnNav.style.display = 'none'; // Hide admin button if not logged in
        }
    }

    // Function to log out the user
    function logoutUser() {
        removeAuthToken();
        updateAuthUI();
        // Redirect to home or refresh page if necessary
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html'; // Redirect admin to home if logged out
        }
    }

    // Add event listeners for login/logout buttons
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            // Redirect to backend Discord login endpoint
            window.location.href = `${BACKEND_URL}/api/auth/discord`;
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }

    // Handle Discord callback
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        saveAuthToken(token);
        // Clean URL after saving token
        window.history.replaceState({}, document.title, window.location.pathname);
        updateAuthUI();
    } else {
        updateAuthUI(); // Update UI on page load
    }

    // --- Auction specific logic (subastas.html) ---
    if (activeAuctionsList) {
        // Function to format time remaining
        function formatTimeRemaining(ms) {
            if (ms <= 0) return 'Finalizada';
            const seconds = Math.floor((ms / 1000) % 60);
            const minutes = Math.floor((ms / (1000 * 60)) % 60);
            const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
            const days = Math.floor(ms / (1000 * 60 * 60 * 24));

            let parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);
            if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`); // Show seconds even if 0 if no other parts

            return parts.join(' ');
        }

        // Function to update countdown for a specific auction
        function updateCountdown(auctionId, endDate, countdownElement, bidButton, bidInput) {
            const now = new Date().getTime();
            const distance = new Date(endDate).getTime() - now;

            if (distance < 0) {
                countdownElement.textContent = 'Finalizada';
                countdownElement.classList.add('finalized');
                if (bidButton) bidButton.disabled = true;
                if (bidInput) bidInput.disabled = true;
                clearInterval(countdownIntervals[auctionId]); // Clear interval once finished
                delete countdownIntervals[auctionId];
                return;
            }

            countdownElement.textContent = formatTimeRemaining(distance);
            countdownElement.classList.remove('finalized'); // Ensure class is removed if auction becomes active again
            if (bidButton) bidButton.disabled = false;
            if (bidInput) bidInput.disabled = false;
        }

        // Function to create an auction card HTML
        function createAuctionCard(auction) {
            const card = document.createElement('div');
            card.className = 'auction-card';
            card.dataset.id = auction._id; // Store auction ID in data attribute

            const endDate = new Date(auction.endDate);
            const now = new Date();
            const isEnded = endDate <= now;
            const statusClass = isEnded ? 'finalized' : ''; // Initial status class

            const currentBidDisplay = auction.currentBidderName ?
                `Pujador actual: <strong>${auction.currentBidderName}</strong>` :
                'Sé el primero en pujar!';

            card.innerHTML = `
                <img src="${auction.imageUrl}" alt="${auction.title}" class="auction-image" onerror="this.onerror=null;this.src='https://placehold.co/400x300/333/FFF?text=Imagen+no+disponible';">
                <h3 class="auction-title">${auction.title}</h3>
                <p class="auction-description">${auction.description}</p>
                <div class="auction-details">
                    <p>Puja inicial: <strong>${auction.startBid.toFixed(2)} Rublos</strong></p>
                    <p>Puja actual: <strong class="current-bid">${auction.currentBid.toFixed(2)} Rublos</strong></p>
                    <p class="current-bidder">${currentBidDisplay}</p>
                    <p>Finaliza en: <span class="countdown ${statusClass}" data-end-date="${auction.endDate}"></span></p>
                </div>
                <div class="bid-controls">
                    <input type="number" step="0.01" min="${(auction.currentBid + 0.01).toFixed(2)}" placeholder="Tu puja" class="bid-input" ${isEnded ? 'disabled' : ''}>
                    <button class="button bid-button" data-id="${auction._id}" ${isEnded ? 'disabled' : ''}>Pujar</button>
                </div>
            `;

            const countdownElement = card.querySelector('.countdown');
            const bidButton = card.querySelector('.bid-button');
            const bidInput = card.querySelector('.bid-input');

            // Initialize countdown
            if (!isEnded) {
                // Clear any existing interval for this auction before setting a new one
                if (countdownIntervals[auction._id]) {
                    clearInterval(countdownIntervals[auction._id]);
                }
                countdownIntervals[auction._id] = setInterval(() => {
                    updateCountdown(auction._id, auction.endDate, countdownElement, bidButton, bidInput);
                }, 1000);
            }
            // Initial call to set the countdown text immediately
            updateCountdown(auction._id, auction.endDate, countdownElement, bidButton, bidInput);

            // Add event listener for bid button
            if (bidButton) {
                bidButton.addEventListener('click', async () => {
                    const bidAmount = parseFloat(bidInput.value);
                    const token = getAuthToken();

                    if (!token) {
                        showModalMessage('Error de Autenticación', 'Necesitas iniciar sesión para pujar.', 'error');
                        return;
                    }

                    if (isNaN(bidAmount) || bidAmount <= auction.currentBid) {
                        showModalMessage('Puja Inválida', `Tu puja debe ser mayor que la puja actual (${auction.currentBid.toFixed(2)} Rublos).`, 'error');
                        return;
                    }

                    try {
                        const response = await fetch(`${BACKEND_URL}/api/auctions/${auction._id}/bid`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ bidAmount })
                        });

                        const result = await response.json();

                        if (response.ok) {
                            showModalMessage('Puja Exitosa', result.message, 'success');
                            // The Socket.IO listener will handle updating the UI for this bid
                            // No need to manually update here, as the 'auctionUpdated' event will trigger
                        } else {
                            showModalMessage('Error de Puja', result.message || 'Error al realizar la puja.', 'error');
                        }
                    } catch (error) {
                        console.error('Error placing bid:', error);
                        showModalMessage('Error de Conexión', 'Error al conectar con el servidor para realizar la puja.', 'error');
                    }
                });
            }
            return card;
        }

        // Function to load active auctions
        async function loadActiveAuctions() {
            auctionsLoadingMessage.style.display = 'block';
            auctionsErrorMessage.style.display = 'none';
            noAuctionsMessage.style.display = 'none';
            activeAuctionsList.innerHTML = ''; // Clear previous auctions

            // Clear all existing countdown intervals before reloading
            for (const auctionId in countdownIntervals) {
                clearInterval(countdownIntervals[auctionId]);
                delete countdownIntervals[auctionId];
            }

            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions/active`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const auctions = await response.json();

                auctionsLoadingMessage.style.display = 'none';

                if (auctions.length === 0) {
                    noAuctionsMessage.style.display = 'block';
                } else {
                    auctions.forEach(auction => {
                        const card = createAuctionCard(auction);
                        activeAuctionsList.appendChild(card);
                    });
                }
            } catch (error) {
                console.error('Error loading active auctions:', error);
                auctionsLoadingMessage.style.display = 'none';
                noAuctionsMessage.style.display = 'none';
                auctionsErrorMessage.style.display = 'block';
                auctionsErrorMessage.textContent = 'Error al cargar las subastas: ' + error.message;
            }
        }

        // --- Socket.IO Real-time updates for auctions ---
        socket.on('auctionUpdated', (updatedAuction) => {
            console.log('Subasta actualizada en tiempo real:', updatedAuction);
            const card = document.querySelector(`.auction-card[data-id="${updatedAuction._id}"]`);
            if (card) {
                // Update existing card
                const currentBidElement = card.querySelector('.current-bid');
                const currentBidderElement = card.querySelector('.current-bidder');
                const countdownElement = card.querySelector('.countdown');
                const bidInput = card.querySelector('.bid-input');
                const bidButton = card.querySelector('.bid-button');

                if (currentBidElement) currentBidElement.textContent = `${updatedAuction.currentBid.toFixed(2)} Rublos`;
                if (currentBidderElement) {
                    currentBidderElement.innerHTML = updatedAuction.currentBidderName ?
                        `Pujador actual: <strong>${updatedAuction.currentBidderName}</strong>` :
                        'Sé el primero en pujar!';
                }

                // Update countdown and button/input states
                const endDate = new Date(updatedAuction.endDate);
                const now = new Date();
                const isEnded = endDate <= now;

                if (isEnded) {
                    countdownElement.textContent = 'Finalizada';
                    countdownElement.classList.add('finalized');
                    if (bidButton) bidButton.disabled = true;
                    if (bidInput) bidInput.disabled = true;
                    clearInterval(countdownIntervals[updatedAuction._id]);
                    delete countdownIntervals[updatedAuction._id];
                } else {
                    // If the auction was finalized but now active again (e.g., admin changed status)
                    // or if it's an active auction getting updated
                    if (!countdownIntervals[updatedAuction._id]) {
                        // Start new interval if it doesn't exist
                        countdownIntervals[updatedAuction._id] = setInterval(() => {
                            updateCountdown(updatedAuction._id, endDate, countdownElement, bidButton, bidInput);
                        }, 1000);
                    }
                    if (bidButton) bidButton.disabled = false;
                    if (bidInput) bidInput.disabled = false;
                }
                if (bidInput) bidInput.min = (updatedAuction.currentBid + 0.01).toFixed(2);
                if (bidInput) bidInput.value = ''; // Clear the input after a bid
            } else if (updatedAuction.status === 'active') {
                // If the auction does not exist in the list and is active, reload to add it (new auction)
                loadActiveAuctions();
            }
        });

        // Logic to handle real-time auction deletion
        socket.on('auctionDeleted', (deletedAuctionId) => {
            console.log('Subasta eliminada en tiempo real:', deletedAuctionId);
            const card = document.querySelector(`.auction-card[data-id="${deletedAuctionId}"]`);
            if (card) {
                // Clear the interval of the deleted auction
                clearInterval(countdownIntervals[deletedAuctionId]);
                delete countdownIntervals[deletedAuctionId];
                // Remove the auction card from the DOM
                card.remove();
                // If no auctions remain, show the "no auctions" message
                if (activeAuctionsList.children.length === 0) {
                    noAuctionsMessage.style.display = 'block';
                }
            }
        });


        // Load auctions when the auctions page loads
        loadActiveAuctions();
    }
});
