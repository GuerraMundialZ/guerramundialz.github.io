document.addEventListener('DOMContentLoaded', () => {
    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com'; // Asegúrate de que esta URL sea correcta

    // Referencias a elementos del DOM (autenticación)
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userDisplay = document.getElementById('user-display');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const createAuctionBtnNav = document.getElementById('create-auction-btn-nav'); // Botón "Crear Subasta" en la navegación
    const adminPanelBtnNav = document.getElementById('admin-panel-btn-nav');     // Botón "Panel Admin" en la navegación

    // Referencias para la sección de subastas activas (subastas.html)
    const activeAuctionsList = document.getElementById('active-auctions-list');
    const noAuctionsMessage = document.getElementById('no-auctions-message');
    const auctionsLoadingMessage = document.getElementById('auctions-loading-message');
    const auctionsErrorMessage = document.getElementById('auctions-error-message');

    // Referencias para la modal de mensajes de puja
    const bidMessageModal = document.getElementById('bid-message-modal');
    const bidModalTitle = document.getElementById('bid-modal-title');
    const bidModalMessage = document.getElementById('bid-modal-message');
    const bidModalCloseBtn = document.getElementById('bid-modal-close-btn');

    // Almacena los intervalos de los contadores regresivos para poder limpiarlos
    const countdownIntervals = {};

    // Función para guardar el token JWT
    function setAuthToken(token) {
        if (token) {
            localStorage.setItem('jwtToken', token);
        } else {
            localStorage.removeItem('jwtToken');
        }
    }

    // Función para obtener el token JWT
    function getAuthToken() {
        return localStorage.getItem('jwtToken');
    }

    // Función para decodificar el token JWT y obtener la información del usuario
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

    // Función para mostrar mensajes en una modal (usada para pujas)
    function showModalMessage(title, message, type = 'info') {
        bidModalTitle.textContent = title;
        // Ajusta la clase para el color del título de la modal
        bidModalTitle.className = type === 'success' ? 'success-message' : (type === 'error' ? 'error-message' : 'info-message');
        bidModalMessage.textContent = message;
        bidMessageModal.style.display = 'flex'; // Usar flex para centrar
    }

    // Cerrar modal de mensajes
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

    // Función para actualizar la UI de autenticación
    async function updateAuthUI() {
        const token = getAuthToken();
        if (token) {
            const decodedToken = parseJwt(token);
            if (decodedToken && decodedToken.id) {
                // Verificar si el token ha expirado
                const currentTime = Date.now() / 1000;
                if (decodedToken.exp < currentTime) {
                    console.log("Token expirado. Cerrando sesión automáticamente.");
                    logoutUser();
                    return;
                }

                const userId = decodedToken.id;
                const username = decodedToken.username || 'Usuario';
                const avatar = decodedToken.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${decodedToken.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
                const isAdminUser = decodedToken.isAdmin; // Asumiendo que el token contiene isAdmin

                userAvatar.src = avatar;
                userName.textContent = username;
                userDisplay.style.display = 'flex';
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';

                // Mostrar/ocultar botones de navegación para admin
                if (isAdminUser) {
                    if (createAuctionBtnNav) createAuctionBtnNav.style.display = 'block';
                    if (adminPanelBtnNav) adminPanelBtnNav.style.display = 'block';
                } else {
                    if (createAuctionBtnNav) createAuctionBtnNav.style.display = 'none';
                    if (adminPanelBtnNav) adminPanelBtnNav.style.display = 'none';
                }

                // Redirigir si está en la página de admin y no es admin
                if (window.location.pathname.includes('admin.html') && !isAdminUser) {
                    window.location.href = 'index.html';
                    return;
                }

            } else {
                logoutUser(); // Token inválido o incompleto
            }
        } else {
            userDisplay.style.display = 'none';
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
            if (createAuctionBtnNav) createAuctionBtnNav.style.display = 'none';
            if (adminPanelBtnNav) adminPanelBtnNav.style.display = 'none';

            // Redirigir si no hay token y está en la página de admin
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = 'index.html';
            }
        }
    }

    // Función para iniciar sesión (redirección a Discord OAuth)
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            window.location.href = `${BACKEND_URL}/auth/discord`;
        });
    }

    // Función para cerrar sesión
    function logoutUser() {
        setAuthToken(null);
        updateAuthUI();
        // Redirigir a la página principal si se cierra sesión desde subastas.html
        if (window.location.pathname.includes('subastas.html')) {
            window.location.href = 'index.html';
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }

    // Manejar el callback de Discord OAuth
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
        setAuthToken(token);
        // Limpiar la URL para que el token no sea visible
        window.history.replaceState({}, document.title, window.location.pathname);
        updateAuthUI(); // Actualizar la UI después de obtener el token
    } else {
        updateAuthUI(); // Actualizar la UI al cargar la página si no hay token en la URL
    }

    // --- Lógica de Scroll Suave (mantener como estaba) ---
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

    // --- Lógica específica para la página de subastas (subastas.html) ---
    if (window.location.pathname.includes('subastas.html')) {

        // Función para actualizar el contador regresivo de una subasta
        function updateCountdown(auctionId, endDate, countdownElement, bidButton, bidInput) {
            const now = new Date().getTime();
            const distance = endDate - now;

            if (distance < 0) {
                countdownElement.innerHTML = '¡Finalizada!';
                if (bidButton) bidButton.disabled = true;
                if (bidInput) bidInput.disabled = true;
                clearInterval(countdownIntervals[auctionId]); // Limpiar el intervalo
                delete countdownIntervals[auctionId]; // Eliminar del objeto de intervalos
                // Opcional: Recargar solo esta subasta para mostrar el ganador si ya está en el backend
                // O simplemente recargar todas las subastas para actualizar el estado
                loadActiveAuctions(); // Recargar para mostrar el estado finalizado
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        // Función para cargar las subastas activas
        async function loadActiveAuctions() {
            auctionsLoadingMessage.style.display = 'block';
            auctionsErrorMessage.style.display = 'none';
            noAuctionsMessage.style.display = 'none';
            activeAuctionsList.innerHTML = ''; // Limpiar la lista de subastas

            // Limpiar todos los intervalos existentes antes de recargar
            for (const id in countdownIntervals) {
                clearInterval(countdownIntervals[id]);
            }
            Object.keys(countdownIntervals).forEach(key => delete countdownIntervals[key]);


            try {
                // Llama a la nueva ruta /api/auctions/active
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
                    auctionCard.dataset.id = auction._id; // Almacenar el ID de la subasta

                    const endDate = new Date(auction.endDate).getTime();
                    const now = new Date().getTime();
                    const isEnded = auction.status === 'finalized' || auction.status === 'cancelled' || endDate < now;

                    auctionCard.innerHTML = `
                        <img src="${auction.imageUrl}" alt="${auction.title}" onerror="this.onerror=null;this.src='https://placehold.co/300x200?text=No+Image';">
                        <div class="auction-card-content">
                            <h3>${auction.title}</h3>
                            <p>${auction.description}</p>
                            <p>Puja actual: <span class="current-bid">${auction.currentBid.toFixed(2)} Rublos</span></p>
                            <p class="current-bidder">${auction.currentBidderName ? `Pujador actual: <strong>${auction.currentBidderName}</strong>` : 'Sé el primero en pujar!'}</p>
                            <p class="countdown" data-end-date="${auction.endDate}"></p>
                            <div class="bid-controls">
                                <input type="number" class="bid-input" placeholder="Tu puja" min="${(auction.currentBid + 0.01).toFixed(2)}" step="0.01" ${isEnded ? 'disabled' : ''}>
                                <button class="button bid-button" data-id="${auction._id}" ${isEnded ? 'disabled' : ''}>Pujar</button>
                            </div>
                        </div>
                    `;
                    activeAuctionsList.appendChild(auctionCard);

                    const countdownElement = auctionCard.querySelector('.countdown');
                    const bidButton = auctionCard.querySelector('.bid-button');
                    const bidInput = auctionCard.querySelector('.bid-input');

                    // Iniciar/actualizar el contador regresivo
                    if (!isEnded) {
                        updateCountdown(auction._id, endDate, countdownElement, bidButton, bidInput); // Llamada inicial
                        countdownIntervals[auction._id] = setInterval(() => {
                            updateCountdown(auction._id, endDate, countdownElement, bidButton, bidInput);
                        }, 1000);
                    } else {
                        countdownElement.innerHTML = '¡Finalizada!';
                    }
                });

                // Añadir event listeners a los botones de puja
                activeAuctionsList.querySelectorAll('.bid-button').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const auctionId = e.target.dataset.id;
                        const bidInput = e.target.closest('.bid-controls').querySelector('.bid-input');
                        const bidAmount = parseFloat(bidInput.value);

                        if (isNaN(bidAmount) || bidAmount <= 0) {
                            showModalMessage('Error de Puja', 'Por favor, introduce una cantidad de puja válida y positiva.', 'error');
                            return;
                        }

                        // Obtener el token del usuario logueado
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
                                // Actualizar solo la tarjeta de subasta específica
                                const updatedAuction = result.auction;
                                const card = document.querySelector(`.auction-card[data-id="${updatedAuction._id}"]`);
                                if (card) {
                                    card.querySelector('.current-bid').textContent = `${updatedAuction.currentBid.toFixed(2)} Rublos`;
                                    card.querySelector('.current-bidder').innerHTML = `Pujador actual: <strong>${updatedAuction.currentBidderName}</strong>`;
                                    // Actualizar el valor mínimo del input de puja
                                    card.querySelector('.bid-input').min = (updatedAuction.currentBid + 0.01).toFixed(2);
                                    bidInput.value = ''; // Limpiar el input después de pujar
                                }
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

        // Cargar subastas al cargar la página de subastas
        loadActiveAuctions();
    }
});
