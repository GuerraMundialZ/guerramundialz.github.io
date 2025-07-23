document.addEventListener('DOMContentLoaded', () => {
    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com'; // Asegúrate de que esta URL sea correcta

    // Importar Socket.IO
    // Asegúrate de añadir <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script> en tu subastas.html
    const socket = io(BACKEND_URL); // Conectar al servidor de Socket.IO

    // Referencias a elementos del DOM (autenticación)
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userDisplay = document.getElementById('user-display');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
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

    // Función para formatear cantidades de dinero con separador de miles (punto) y decimales (solo si son necesarios)
    function formatCurrency(amount) {
        // Usa 'es-ES' para el formato base (punto para miles, coma para decimales)
        const formatter = new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 0, // Por defecto, 0 decimales
            maximumFractionDigits: 2, // Máximo 2 decimales
            useGrouping: true // Habilita el separador de miles
        });

        let formatted = formatter.format(amount);

        // Si el número es un entero (ej. 12.00), Intl.NumberFormat con minimumFractionDigits: 0
        // ya lo formatearía como "12". Si tiene decimales, los mostrará (ej. 12,50).
        // No se necesita lógica adicional para eliminar ",00" si se usa minimumFractionDigits: 0.

        return formatted;
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

                // Mostrar/ocultar botón de Panel Admin
                if (adminPanelBtnNav) {
                    if (isAdminUser) {
                        adminPanelBtnNav.style.display = 'block';
                    } else {
                        adminPanelBtnNav.style.display = 'none';
                    }
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
            if (adminPanelBtnNav) adminPanelBtnNav.style.display = 'none'; // Asegurarse de ocultarlo si no hay token

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
        // Redirigir a la página principal si se cierra sesión desde subastas.html o admin.html
        if (window.location.pathname.includes('subastas.html') || window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }

    // Añadir listener para el botón "Panel Admin"
    if (adminPanelBtnNav) {
        adminPanelBtnNav.addEventListener('click', () => {
            window.location.href = 'admin.html'; // Redirige a la página de administración
        });
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
                // No recargar loadActiveAuctions() aquí, ya que el evento socket.io 'auctionUpdated' se encargará.
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
                            <p>Puja actual: <span class="current-bid">${formatCurrency(auction.currentBid)} Rublos</span></p>
                            <p class="current-bidder">${auction.currentBidderName ? `Pujador actual: <strong>${auction.currentBidderName}</strong>` : 'Sé el primero en pujar!'}</p>
                            <p class="countdown" data-end-date="${auction.endDate}"></p>
                            <div class="bid-controls">
                                <input type="number" class="bid-input" placeholder="Tu puja" min="${(auction.currentBid + 0.01).toFixed(2)}" step="5000" ${isEnded ? 'disabled' : ''}>
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
                        // Validar que la puja sea un múltiplo de 5000 y mayor que la puja actual
                        const currentBidElement = e.target.closest('.auction-card-content').querySelector('.current-bid');
                        const currentBidText = currentBidElement.textContent.replace(/[^0-9,-]+/g, '').replace(',', '.'); // Limpiar y convertir a formato numérico
                        const currentBid = parseFloat(currentBidText);

                        if (bidAmount <= currentBid) {
                            showModalMessage('Error de Puja', `Tu puja (${formatCurrency(bidAmount)} Rublos) debe ser mayor que la puja actual (${formatCurrency(currentBid)} Rublos).`, 'error');
                            return;
                        }

                        if ((bidAmount - currentBid) % 5000 !== 0 && bidAmount !== currentBid + 5000) {
                            showModalMessage('Error de Puja', `Tu puja debe ser un incremento de 5.000 Rublos sobre la puja actual.`, 'error');
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
                                // La actualización de la UI se manejará a través del evento Socket.IO
                                bidInput.value = ''; // Limpiar el input después de pujar
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

        // Lógica para manejar las actualizaciones de subastas en tiempo real
        socket.on('auctionUpdated', (updatedAuction) => {
            console.log('Subasta actualizada en tiempo real:', updatedAuction);
            const card = document.querySelector(`.auction-card[data-id="${updatedAuction._id}"]`);
            if (card) {
                // Actualizar los elementos de la tarjeta con la nueva información
                card.querySelector('.current-bid').textContent = `${formatCurrency(updatedAuction.currentBid)} Rublos`;
                card.querySelector('.current-bidder').innerHTML = updatedAuction.currentBidderName ? `Pujador actual: <strong>${updatedAuction.currentBidderName}</strong>` : 'Sé el primero en pujar!';
                card.querySelector('.bid-input').min = (updatedAuction.currentBid + 0.01).toFixed(2);

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
                    clearInterval(countdownIntervals[updatedAuction._id]); // Limpiar el intervalo si finaliza
                    delete countdownIntervals[updatedAuction._id];
                    // Si la subasta ha finalizado, recargar para asegurar que se elimine o muestre el ganador
                    loadActiveAuctions();
                } else {
                    // Si la subasta sigue activa, asegurar que el contador se actualice
                    // y que los botones estén habilitados
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
                // Si la subasta no existe en la lista y está activa, recargar para añadirla (nueva subasta)
                loadActiveAuctions();
            }
        });

        // Lógica para manejar la eliminación de subastas en tiempo real
        socket.on('auctionDeleted', (deletedAuctionId) => {
            console.log('Subasta eliminada en tiempo real:', deletedAuctionId);
            const card = document.querySelector(`.auction-card[data-id="${deletedAuctionId}"]`);
            if (card) {
                // Limpiar el intervalo de la subasta eliminada
                clearInterval(countdownIntervals[deletedAuctionId]);
                delete countdownIntervals[deletedAuctionId];
                // Eliminar la tarjeta de la subasta del DOM
                card.remove();
                // Si no quedan subastas, mostrar el mensaje de "no hay subastas"
                if (activeAuctionsList.children.length === 0) {
                    noAuctionsMessage.style.display = 'block';
                }
            }
        });


        // Cargar subastas al cargar la página de subastas
        loadActiveAuctions();
    }
});
