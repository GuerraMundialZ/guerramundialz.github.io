// [DEBUG] admin-script.js: Script loaded and running.
document.addEventListener('DOMContentLoaded', () => {
    // URL of your Render backend
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com'; // Make sure this URL is correct

    // Import Socket.IO
    // Make sure you have added <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script> in your admin.html
    const socket = io(BACKEND_URL); // Connect to the Socket.IO server

    // References to DOM elements (authentication and navigation)
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userDisplay = document.getElementById('user-display');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const adminPanelBtnNav = document.getElementById('admin-panel-btn-nav');

    // References for the Create Auction section
    const createAuctionForm = document.getElementById('create-auction-form');
    const createAuctionMessage = document.getElementById('create-auction-message');

    // References for the Manage Auctions section
    const adminAuctionsTableBody = document.querySelector('#admin-auctions-table tbody');
    const auctionsLoadingMessage = document.getElementById('auctions-loading-message');
    const auctionsErrorMessage = document.getElementById('auctions-error-message');

    // References for the Edit Modal
    const editAuctionModal = document.getElementById('edit-auction-modal');
    const editAuctionCloseBtn = editAuctionModal ? editAuctionModal.querySelector('.close-button') : null;
    const editAuctionForm = document.getElementById('edit-auction-form');
    const editAuctionMessage = document.getElementById('edit-auction-message');

    // References for the Delete Confirmation Modal
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const confirmDeleteCloseBtn = confirmDeleteModal ? confirmDeleteModal.querySelector('.close-button') : null;
    const auctionToDeleteTitleSpan = document.getElementById('auction-to-delete-title');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteAuctionMessage = document.getElementById('delete-auction-message');

    // References for the General Confirmation Modal (for finalize)
    const generalConfirmModal = document.getElementById('general-confirm-modal');
    const generalConfirmTitle = document.getElementById('general-confirm-title');
    const generalConfirmMessage = document.getElementById('general-confirm-message');
    const generalConfirmActionBtn = document.getElementById('general-confirm-action-btn');
    const generalCancelBtn = document.getElementById('general-cancel-btn');
    const generalConfirmCloseBtn = generalConfirmModal ? generalConfirmModal.querySelector('.close-button') : null;

    let currentAuctionIdToEdit = null; // Store the ID of the auction being edited
    let confirmActionCallback = null; // Callback for general confirmation modal

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

    // Function to show messages in specific elements
    function showMessage(element, message, type) {
        if (element) {
            element.textContent = message;
            element.className = 'message'; // Reset classes
            element.classList.add(type + '-message'); // Add type-specific class
            element.style.display = 'block';
        }
    }

    // Function to hide messages in specific elements
    function hideMessage(element) {
        if (element) {
            element.style.display = 'none';
            element.textContent = '';
        }
    }

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

                    // Check if the user is an admin
                    if (user.isAdmin) {
                        adminPanelBtnNav.style.display = 'block';
                        // If on admin.html and user is admin, load auctions
                        if (window.location.pathname.includes('admin.html')) {
                            loadAdminAuctions();
                        }
                    } else {
                        adminPanelBtnNav.style.display = 'none';
                        // If on admin.html and user is not admin, redirect to home
                        if (window.location.pathname.includes('admin.html')) {
                            alert('Acceso denegado. No eres administrador.'); // Use modal later
                            window.location.href = 'index.html';
                        }
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
            // If on admin.html and not logged in, redirect to home
            if (window.location.pathname.includes('admin.html')) {
                // No alert here, just redirect
                window.location.href = 'index.html';
            }
        }
    }

    // Function to log out the user
    function logoutUser() {
        removeAuthToken();
        updateAuthUI();
        // Redirect to home if on admin page after logout
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
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

    // --- Admin Panel Specific Logic (admin.html) ---
    if (createAuctionForm) {
        createAuctionForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            hideMessage(createAuctionMessage); // Hide previous messages

            const title = document.getElementById('auction-title').value;
            const description = document.getElementById('auction-description').value;
            const imageUrl = document.getElementById('auction-image-url').value;
            const startBid = parseFloat(document.getElementById('auction-start-bid').value);
            const endDate = document.getElementById('auction-end-date').value;

            if (!title || !description || !startBid || !endDate) {
                showMessage(createAuctionMessage, 'Todos los campos son obligatorios.', 'error');
                return;
            }
            if (isNaN(startBid) || startBid < 0) {
                showMessage(createAuctionMessage, 'La puja inicial debe ser un número positivo.', 'error');
                return;
            }
            if (new Date(endDate) <= new Date()) {
                showMessage(createAuctionMessage, 'La fecha de finalización debe ser en el futuro.', 'error');
                return;
            }

            const token = getAuthToken();
            if (!token) {
                showMessage(createAuctionMessage, 'No autenticado para crear subastas.', 'error');
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, description, imageUrl, startBid, endDate })
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage(createAuctionMessage, 'Subasta creada con éxito!', 'success');
                    createAuctionForm.reset(); // Clear form
                    loadAdminAuctions(); // Reload table to show new auction
                } else {
                    showMessage(createAuctionMessage, result.message || 'Error al crear la subasta.', 'error');
                }
            } catch (error) {
                console.error('Error creating auction:', error);
                showMessage(createAuctionMessage, 'Error de conexión al crear la subasta.', 'error');
            }
        });
    }

    // Function to load and display all auctions for admin
    async function loadAdminAuctions() {
        if (!adminAuctionsTableBody) return; // Ensure element exists

        auctionsLoadingMessage.style.display = 'block';
        auctionsErrorMessage.style.display = 'none';
        adminAuctionsTableBody.innerHTML = ''; // Clear existing rows

        const token = getAuthToken();
        if (!token) {
            showMessage(auctionsErrorMessage, 'No autenticado para ver las subastas.', 'error');
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/auctions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('No tienes permisos de administrador para ver esta sección.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const auctions = await response.json();
            auctionsLoadingMessage.style.display = 'none';

            if (auctions.length === 0) {
                const row = adminAuctionsTableBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 9;
                cell.textContent = 'No hay subastas para gestionar.';
                cell.style.textAlign = 'center';
            } else {
                auctions.forEach(auction => {
                    const row = adminAuctionsTableBody.insertRow();
                    row.dataset.id = auction._id; // Store auction ID on the row

                    const endDate = new Date(auction.endDate);
                    const now = new Date();
                    const isEnded = endDate <= now;
                    const statusText = isEnded && auction.status === 'active' ? 'Finalizada (Pendiente)' :
                                       auction.status === 'finalized' ? `Finalizada (${auction.winnerName || 'Sin pujas'})` :
                                       auction.status === 'cancelled' ? 'Cancelada' : 'Activa';
                    const statusClass = auction.status === 'active' && isEnded ? 'status-pending' : `status-${auction.status}`;

                    row.innerHTML = `
                        <td>${auction.title}</td>
                        <td>${auction.creatorName}</td>
                        <td>${auction.startBid.toFixed(2)}</td>
                        <td>${auction.currentBid.toFixed(2)}</td>
                        <td>${auction.currentBidderName || 'N/A'}</td>
                        <td>${new Date(auction.endDate).toLocaleString()}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>
                            <button class="button button-small edit-button" data-id="${auction._id}" ${auction.status !== 'active' ? 'disabled' : ''}>Editar</button>
                            <button class="button button-small button-danger delete-button" data-id="${auction._id}">Eliminar</button>
                            <button class="button button-small button-info finalize-button" data-id="${auction._id}" ${auction.status !== 'active' ? 'disabled' : ''}>Finalizar</button>
                        </td>
                    `;
                });

                // Add event listeners for edit, delete, and finalize buttons
                adminAuctionsTableBody.querySelectorAll('.edit-button').forEach(button => {
                    button.addEventListener('click', (event) => openEditModal(event.target.dataset.id));
                });
                adminAuctionsTableBody.querySelectorAll('.delete-button').forEach(button => {
                    button.addEventListener('click', (event) => openConfirmDeleteModal(event.target.dataset.id));
                });
                adminAuctionsTableBody.querySelectorAll('.finalize-button').forEach(button => {
                    button.addEventListener('click', (event) => openFinalizeConfirmModal(event.target.dataset.id));
                });
            }
        } catch (error) {
            console.error('Error loading admin auctions:', error);
            auctionsLoadingMessage.style.display = 'none';
            showMessage(auctionsErrorMessage, error.message || 'Error al cargar las subastas de administración.', 'error');
        }
    }

    // --- Edit Auction Modal Logic ---
    if (editAuctionModal) {
        if (editAuctionCloseBtn) {
            editAuctionCloseBtn.addEventListener('click', () => {
                editAuctionModal.style.display = 'none';
                hideMessage(editAuctionMessage);
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target === editAuctionModal) {
                editAuctionModal.style.display = 'none';
                hideMessage(editAuctionMessage);
            }
        });

        async function openEditModal(auctionId) {
            currentAuctionIdToEdit = auctionId;
            hideMessage(editAuctionMessage);

            const token = getAuthToken();
            if (!token) {
                showMessage(editAuctionMessage, 'No autenticado para editar subastas.', 'error');
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`Error fetching auction data: ${response.statusText}`);
                }
                const auction = await response.json();

                document.getElementById('edit-auction-id').value = auction._id;
                document.getElementById('edit-auction-title').value = auction.title;
                document.getElementById('edit-auction-description').value = auction.description;
                document.getElementById('edit-auction-image-url').value = auction.imageUrl;
                document.getElementById('edit-auction-start-bid').value = auction.startBid.toFixed(2);
                document.getElementById('edit-auction-current-bid').value = auction.currentBid.toFixed(2);
                document.getElementById('edit-auction-current-bidder-name').value = auction.currentBidderName || '';

                // Format end date for datetime-local input
                const endDate = new Date(auction.endDate);
                const formattedEndDate = endDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
                document.getElementById('edit-auction-end-date').value = formattedEndDate;

                document.getElementById('edit-auction-status').value = auction.status;

                editAuctionModal.style.display = 'block';
            } catch (error) {
                console.error('Error opening edit modal:', error);
                showMessage(auctionsErrorMessage, 'Error al cargar datos de la subasta para edición.', 'error');
            }
        }

        editAuctionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideMessage(editAuctionMessage);

            const auctionId = document.getElementById('edit-auction-id').value;
            const title = document.getElementById('edit-auction-title').value;
            const description = document.getElementById('edit-auction-description').value;
            const imageUrl = document.getElementById('edit-auction-image-url').value;
            const startBid = parseFloat(document.getElementById('edit-auction-start-bid').value);
            const currentBid = parseFloat(document.getElementById('edit-auction-current-bid').value);
            const currentBidderName = document.getElementById('edit-auction-current-bidder-name').value;
            const endDate = document.getElementById('edit-auction-end-date').value;
            const status = document.getElementById('edit-auction-status').value;

            if (!title || !description || isNaN(startBid) || isNaN(currentBid) || !endDate || !status) {
                showMessage(editAuctionMessage, 'Todos los campos son obligatorios.', 'error');
                return;
            }
            if (new Date(endDate) <= new Date() && status === 'active') {
                showMessage(editAuctionMessage, 'La fecha de finalización debe ser en el futuro para subastas activas.', 'error');
                return;
            }
            if (currentBid < startBid) {
                showMessage(editAuctionMessage, 'La puja actual no puede ser menor que la puja inicial.', 'error');
                return;
            }

            const token = getAuthToken();
            if (!token) {
                showMessage(editAuctionMessage, 'No autenticado para actualizar subastas.', 'error');
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title,
                        description,
                        imageUrl,
                        startBid,
                        currentBid,
                        currentBidderName,
                        endDate,
                        status
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage(editAuctionMessage, 'Subasta actualizada con éxito!', 'success');
                    editAuctionModal.style.display = 'none';
                    loadAdminAuctions(); // Reload table to show updated auction
                } else {
                    showMessage(editAuctionMessage, result.message || 'Error al actualizar la subasta.', 'error');
                }
            } catch (error) {
                console.error('Error updating auction:', error);
                showMessage(editAuctionMessage, 'Error de conexión al actualizar la subasta.', 'error');
            }
        });
    }

    // --- Delete Confirmation Modal Logic ---
    if (confirmDeleteModal) {
        if (confirmDeleteCloseBtn) {
            confirmDeleteCloseBtn.addEventListener('click', () => {
                confirmDeleteModal.style.display = 'none';
                hideMessage(deleteAuctionMessage);
            });
        }
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                confirmDeleteModal.style.display = 'none';
                hideMessage(deleteAuctionMessage);
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target === confirmDeleteModal) {
                confirmDeleteModal.style.display = 'none';
                hideMessage(deleteAuctionMessage);
            }
        });

        let auctionIdToDelete = null;

        function openConfirmDeleteModal(auctionId) {
            auctionIdToDelete = auctionId;
            hideMessage(deleteAuctionMessage);

            const row = adminAuctionsTableBody.querySelector(`tr[data-id="${auctionId}"]`);
            const auctionTitle = row ? row.cells[0].textContent : 'esta subasta';
            if (auctionToDeleteTitleSpan) {
                auctionToDeleteTitleSpan.textContent = auctionTitle;
            }
            confirmDeleteModal.style.display = 'block';
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                if (!auctionIdToDelete) return;

                hideMessage(deleteAuctionMessage);

                const token = getAuthToken();
                if (!token) {
                    showMessage(deleteAuctionMessage, 'No autenticado para eliminar subastas.', 'error');
                    return;
                }

                try {
                    const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionIdToDelete}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    const result = await response.json();

                    if (response.ok) {
                        showMessage(deleteAuctionMessage, 'Subasta eliminada con éxito!', 'success');
                        confirmDeleteModal.style.display = 'none';
                        loadAdminAuctions(); // Reload table to show updated state
                    } else {
                        showMessage(deleteAuctionMessage, result.message || 'Error al eliminar la subasta.', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting auction:', error);
                    showMessage(deleteAuctionMessage, 'Error de conexión al eliminar la subasta.', 'error');
                } finally {
                    auctionIdToDelete = null;
                }
            });
        }
    }

    // --- General Confirmation Modal Logic (for Finalize) ---
    if (generalConfirmModal) {
        function openFinalizeConfirmModal(auctionId) {
            generalConfirmTitle.textContent = 'Confirmar Finalización';
            generalConfirmMessage.textContent = '¿Estás seguro de que quieres finalizar esta subasta manualmente? Esto la cerrará y determinará un ganador si hay pujas.';
            generalConfirmActionBtn.textContent = 'Finalizar Ahora';
            generalConfirmActionBtn.className = 'button button-danger'; // Red button for finalize

            confirmActionCallback = () => finalizeAuction(auctionId);
            generalConfirmModal.style.display = 'block';
            hideMessage(auctionsErrorMessage); // Clear any previous error messages
        }

        if (generalConfirmActionBtn) {
            generalConfirmActionBtn.addEventListener('click', () => {
                if (confirmActionCallback) {
                    confirmActionCallback();
                    generalConfirmModal.style.display = 'none';
                    confirmActionCallback = null; // Clear the callback
                }
            });
        }

        if (generalCancelBtn) {
            generalCancelBtn.addEventListener('click', () => {
                generalConfirmModal.style.display = 'none';
                confirmActionCallback = null;
            });
        }

        if (generalConfirmCloseBtn) {
            generalConfirmCloseBtn.addEventListener('click', () => {
                generalConfirmModal.style.display = 'none';
                confirmActionCallback = null;
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target === generalConfirmModal) {
                generalConfirmModal.style.display = 'none';
                confirmActionCallback = null;
            }
        });

        async function finalizeAuction(auctionId) {
            const token = getAuthToken();
            if (!token) {
                showMessage(auctionsErrorMessage, 'No autenticado para finalizar subastas.', 'error');
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}/finalize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage(auctionsErrorMessage, 'Subasta finalizada manualmente con éxito!', 'success');
                    loadAdminAuctions(); // Reload table to see updated status
                } else {
                    showMessage(auctionsErrorMessage, result.message || 'Error al finalizar la subasta manualmente.', 'error');
                }
            } catch (error) {
                console.error('Error finalizing auction manually:', error);
                showMessage(auctionsErrorMessage, 'Error de conexión al finalizar la subasta.', 'error');
            }
        }

        // Call loadAdminAuctions only if the user is admin (this is handled in updateAuthUI)
        // It's not called directly here, as updateAuthUI takes care of it after authentication.
    }


    // --- Logic to handle real-time auction updates ---
    socket.on('auctionUpdated', (updatedAuction) => {
        console.log('Subasta actualizada en tiempo real (admin):', updatedAuction);
        // Reload the table to reflect the changes
        loadAdminAuctions();
    });

    socket.on('auctionDeleted', (deletedAuctionId) => {
        console.log('Subasta eliminada en tiempo real (admin):', deletedAuctionId);
        // Reload the table to reflect the deletion
        loadAdminAuctions();
    });

    // Call updateAuthUI at the end to set up the initial UI
    updateAuthUI();
});
