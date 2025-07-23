document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded en script.js'); // Línea de depuración 1

    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com'; // Asegúrate de que esta URL sea correcta

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

    // Stores countdown intervals to clear them
    const countdownIntervals = {};

    // Function to save the JWT token
    function setAuthToken(token) {
        if (token) {
            localStorage.setItem('jwtToken', token);
        } else {
            localStorage.removeItem('jwtToken');
        }
    }

    // Function to get the JWT token
    function getAuthToken() {
        return localStorage.getItem('jwtToken');
    }

    // Function to decode the JWT token and get user information
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Error parsing JWT:", e);
            return null;
        }
    }

    // Function to display messages in a modal (used for bids)
    function showModalMessage(title, message, type = 'info') {
        bidModalTitle.textContent = title;
        // Adjust the class for the modal title color
        bidModalTitle.className = type === 'success' ? 'success-message' : (type === 'error' ? 'error-message' : 'info-message');
        bidModalMessage.textContent = message;
        bidMessageModal.style.display = 'flex'; // Use flex for centering
    }

    // Close message modal
    if (bidMessageModal) {
        bidMessageModal.querySelector('.close-button').addEventListener('click', () => {
            bidMessageModal.style.display = 'none';
        });
        if (bidModalCloseBtn) {
            bidModalCloseBtn.addEventListener('click', () => {
                bidMessageModal.style.display = 'none';
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target === bidMessageModal) {
                bidMessageModal.style.display = 'none';
            }
        });
    }

    // Function to format currency amounts with thousands separator (dot) and decimals (only if necessary)
    function formatCurrency(amount) {
        // Use 'es-ES' for the base format (dot for thousands, comma for decimals)
        const formatter = new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 0, // By default, 0 decimals
            maximumFractionDigits: 2, // Maximum 2 decimals
            useGrouping: true // Enable thousands separator
        });
        return formatter.format(amount);
    }

    // Function to update authentication UI
    async function updateAuthUI() {
        const token = getAuthToken();
        if (token) {
            const decodedToken = parseJwt(token);
            if (decodedToken && decodedToken.id) {
                // Check if the token has expired
                const currentTime = Date.now() / 1000;
                if (decodedToken.exp < currentTime) {
                    console.log("Token expired. Logging out automatically.");
                    logoutUser();
                    return;
                }

                const userId = decodedToken.id;
                const username = decodedToken.username || 'Usuario';
                const avatar = decodedToken.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${decodedToken.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
                const isAdminUser = decodedToken.isAdmin; // Assuming the token contains isAdmin

                userAvatar.src = avatar;
                userName.textContent = username;
                userDisplay.style.display = 'flex';
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';

                // Show/hide Admin Panel button
                if (adminPanelBtnNav) {
                    if (isAdminUser) {
                        adminPanelBtnNav.style.display = 'block';
                    } else {
                        adminPanelBtnNav.style.display = 'none';
                    }
                }

                // Redirect if on admin page and not admin
                if (window.location.pathname.includes('admin.html') && !isAdminUser) {
                    window.location.href = 'index.html';
                    return;
                }

            } else {
                logoutUser(); // Invalid or incomplete token
            }
        } else {
            userDisplay.style.display = 'none';
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
            if (adminPanelBtnNav) adminPanelBtnNav.style.display = 'none'; // Ensure it's hidden if no token

            // Redirect if no token and on admin page
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = 'index.html';
            }
        }
    }

    // Function to log in (redirect to Discord OAuth)
    if (loginButton) {
        console.log('Attaching click listener to loginButton.'); // Debugging line 4
        loginButton.addEventListener('click', () => {
            console.log('Login button clicked. Redirecting to Discord OAuth.'); // Debugging line 5
            window.location.href = `${BACKEND_URL}/auth/discord`;
        });
    } else {
        console.error('Login button not found with ID "login-button".'); // Debugging line 6
    }

    // Function to log out
    function logoutUser() {
        setAuthToken(null);
        updateAuthUI();
        // Redirect to main page if logging out from subastas.html or admin.html
        if (window.location.pathname.includes('subastas.html') || window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }

    // Add listener for "Admin Panel" button
    if (adminPanelBtnNav) {
        adminPanelBtnNav.addEventListener('click', () => {
            window.location.href = 'admin.html'; // Redirect to the administration page
        });
    }

    // Handle Discord OAuth callback
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
        setAuthToken(token);
        // Clear the URL so the token is not visible
        window.history.replaceState({}, document.title, window.location.pathname);
        updateAuthUI(); // Update UI after getting the token
    } else {
        updateAuthUI(); // Update UI on page load if no token in URL
    }

    // --- Smooth Scroll Logic (keep as is) ---
    document.querySelectorAll('.header nav ul li a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const header = document.querySelector('.header');
                const headerHeight = header ? header.offsetHeight : 0;

                const targetPosition = targetElement.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- Specific logic for the auctions page (subastas.html) ---
    if (window.location.pathname.includes('subastas.html')) {

        // Function to update the auction countdown
        function updateCountdown(auctionId, endDate, countdownElement, bidButton, bidInput) {
            const now = new Date().getTime();
            const distance = endDate - now;

            if (distance < 0) {
                countdownElement.innerHTML = '¡Finalizada!';
                if (bidButton) bidButton.disabled = true;
                if (bidInput) bidInput.disabled = true;
                clearInterval(countdownIntervals[auctionId]); // Clear the interval
                delete countdownIntervals[auctionId]; // Remove from the intervals object
                loadActiveAuctions(); // Reload to show finalized status
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        // Function to load active auctions
        async function loadActiveAuctions() {
            auctionsLoadingMessage.style.display = 'block';
            auctionsErrorMessage.style.display = 'none';
            noAuctionsMessage.style.display = 'none';
            activeAuctionsList.innerHTML = ''; // Clear the auction list

            // Clear all existing intervals before reloading
            for (const id in countdownIntervals) {
                clearInterval(countdownIntervals[id]);
            }
            Object.keys(countdownIntervals).forEach(key => delete countdownIntervals[key]);


            try {
                // Call the new /api/auctions/active route
                const response = await fetch(`${BACKEND_URL}/api/auctions/active`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const auctions = await response.json();
                auctionsLoadingMessage.style.display = 'none';

                if (auctions.length === 0) {
                    noAuctionsMessage.style.display = 'block';
                    return;
                }

                auctions.forEach(auction => {
                    const auctionCard = document.createElement('div');
                    auctionCard.className = 'auction-card';
                    auctionCard.dataset.id = auction._id; // Store the auction ID

                    const endDate = new Date(auction.endDate).getTime();
                    const now = new Date().getTime();
                    const isEnded = auction.status === 'finalized' || auction.status === 'cancelled' || endDate < now;

                    // Calculate the minimum value for the next bid
                    // Ensure the minimum is an integer and a multiple of 5000
                    const nextMinBid = Math.floor(auction.currentBid / 5000) * 5000 + 5000;

                    auctionCard.innerHTML = `
                        <img src="${auction.imageUrl}" alt="${auction.title}" onerror="this.onerror=null;this.src='https://placehold.co/300x200?text=No+Image';">
                        <div class="auction-card-content">
                            <h3>${auction.title}</h3>
                            <p>${auction.description}</p>
                            <p>Puja actual: <span class="current-bid">${formatCurrency(auction.currentBid)} Rublos</span></p>
                            <p class="current-bidder">${auction.currentBidderName ? `Pujador actual: <strong>${auction.currentBidderName}</strong>` : 'Sé el primero en pujar!'}</p>
                            <p class="countdown" data-end-date="${auction.endDate}"></p>
                            <div class="bid-controls">
                                <input type="number" class="bid-input" placeholder="Tu puja" min="${nextMinBid}" step="5000" ${isEnded ? 'disabled' : ''}>
                                <button class="button bid-button" data-id="${auction._id}" ${isEnded ? 'disabled' : ''}>Pujar</button>
                            </div>
                        </div>
                    `;
                    activeAuctionsList.appendChild(auctionCard);

                    const countdownElement = auctionCard.querySelector('.countdown');
                    const bidButton = auctionCard.querySelector('.bid-button');
                    const bidInput = auctionCard.querySelector('.bid-input');

                    // Start/update the countdown
                    if (!isEnded) {
                        updateCountdown(auction._id, endDate, countdownElement, bidButton, bidInput); // Initial call
                        countdownIntervals[auction._id] = setInterval(() => {
                            updateCountdown(auction._id, endDate, countdownElement, bidButton, bidInput);
                        }, 1000);
                    } else {
                        countdownElement.innerHTML = '¡Finalizada!';
                    }
                });

                // Add event listeners to bid buttons
                activeAuctionsList.querySelectorAll('.bid-button').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const auctionId = e.target.dataset.id;
                        const bidInput = e.target.closest('.bid-controls').querySelector('.bid-input');
                        const bidAmount = parseInt(bidInput.value); // Convert to integer

                        if (isNaN(bidAmount) || bidAmount <= 0) {
                            showModalMessage('Error de Puja', 'Por favor, introduce una cantidad de puja válida y positiva.', 'error');
                            return;
                        }
                        // Validate that the bid is a multiple of 5000 and greater than the current bid
                        const currentBidElement = e.target.closest('.auction-card-content').querySelector('.current-bid');
                        // Clean the text to get only the number and convert to integer
                        const currentBid = parseInt(currentBidElement.textContent.replace(/[^0-9]/g, ''));

                        if (bidAmount <= currentBid) {
                            showModalMessage('Error de Puja', `Tu puja (${formatCurrency(bidAmount)} Rublos) debe ser mayor que la puja actual (${formatCurrency(currentBid)} Rublos).`, 'error');
                            return;
                        }

                        // The bid must be an increment of 5000 over the current bid
                        if ((bidAmount - currentBid) % 5000 !== 0) {
                             showModalMessage('Error de Puja', `Tu puja debe ser un incremento de 5.000 Rublos sobre la puja actual.`, 'error');
                             return;
                        }

                        // Get the logged-in user's token
                        const token = getAuthToken();
                        if (!token) {
                            showModalMessage('Error de Autenticación', 'Debes iniciar sesión para realizar una puja.', 'error');
                            return;
                        }

                        try {
                            const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}/bid`, {
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
                                // UI update will be handled via Socket.IO event
                                bidInput.value = ''; // Clear input after bidding
                            } else {
                                showModalMessage('Error de Puja', result.message || 'Error al realizar la puja.', 'error');
                            }
                        } catch (error) {
                            console.error('Error placing bid:', error);
                            showModalMessage('Error de Conexión', 'Error al conectar con el servidor para realizar la puja.', 'error');
                        }
                    });
                });

            } catch (error) {
                console.error('Error loading active auctions:', error);
                auctionsLoadingMessage.style.display = 'none';
                noAuctionsMessage.style.display = 'none';
                auctionsErrorMessage.style.display = 'block';
                auctionsErrorMessage.textContent = 'Error al cargar las subastas: ' + error.message;
            }
        }

        // Logic to handle real-time auction updates
        socket.on('auctionUpdated', (updatedAuction) => {
            console.log('Auction updated in real time:', updatedAuction);
            const card = document.querySelector(`.auction-card[data-id="${updatedAuction._id}"]`);
            if (card) {
                // Update card elements with new information
                card.querySelector('.current-bid').textContent = `${formatCurrency(updatedAuction.currentBid)} Rublos`;
                card.querySelector('.current-bidder').innerHTML = updatedAuction.currentBidderName ? `Pujador actual: <strong>${updatedAuction.currentBidderName}</strong>` : 'Sé el primero en pujar!';
                
                // Update the minimum value of the bid input
                // Ensure the minimum is an integer and a multiple of 5000
                const nextMinBid = Math.floor(updatedAuction.currentBid / 5000) * 5000 + 5000;
                card.querySelector('.bid-input').min = nextMinBid;


                const countdownElement = card.querySelector('.countdown');
                const bidButton = card.querySelector('.bid-button');
                const bidInput = card.querySelector('.bid-input');

                const endDate = new Date(updatedAuction.endDate).getTime();
                const now = new Date().getTime();
                const isEnded = updatedAuction.status === 'finalized' || updatedAuction.status === 'cancelled' || endDate < now;

                if (isEnded) {
                    countdownElement.innerHTML = '¡Finalizada!';
                    if (bidButton) bidButton.disabled = true;
                    if (bidInput) bidInput.disabled = true;
                    clearInterval(countdownIntervals[updatedAuction._id]); // Clear interval if ended
                    delete countdownIntervals[updatedAuction._id];
                    // If the auction has ended, reload to ensure it is removed or the winner is shown
                    loadActiveAuctions();
                } else {
                    // If the auction is still active, ensure the counter is updated
                    // and buttons are enabled
                    if (!countdownIntervals[updatedAuction._id]) {
                        updateCountdown(updatedAuction._id, endDate, countdownElement, bidButton, bidInput);
                        countdownIntervals[updatedAuction._id] = setInterval(() => {
                            updateCountdown(updatedAuction._id, endDate, countdownElement, bidButton, bidInput);
                        }, 1000);
                    }
                    if (bidButton) bidButton.disabled = false;
                    if (bidInput) bidInput.disabled = false;
                }
            } else if (updatedAuction.status === 'active') {
                // If the auction does not exist in the list and is active, reload to add it (new auction)
                loadActiveAuctions();
            }
        });

        // Logic to handle real-time auction deletion
        socket.on('auctionDeleted', (deletedAuctionId) => {
            console.log('Auction deleted in real time:', deletedAuctionId);
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
