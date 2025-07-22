// Espera a que todo el contenido de la página (HTML, CSS, imágenes) haya cargado
window.addEventListener('load', function() {
    const preloader = document.getElementById('preloader');
    const popupMessage = document.getElementById('popup-message'); // Nuevo: Referencia al pop-up
    const closePopup = document.querySelector('.close-popup');     // Nuevo: Referencia al botón de cerrar

    // Lógica para la pantalla de carga (preloader)
    // Añade un pequeño retardo opcional (ej. 500ms = 0.5 segundos)
    setTimeout(function() {
        if (preloader) {
            preloader.classList.add('fade-out'); // Añade la clase para iniciar el desvanecimiento
            // Opcional: Elimina el preloader del DOM después de la transición
            preloader.addEventListener('transitionend', function() {
                preloader.style.display = 'none';
                // Mostrar el pop-up DESPUÉS de que el preloader haya desaparecido
                // con un retardo adicional de 1 segundo para que no aparezca de golpe
                setTimeout(function() {
                    if (popupMessage) {
                        popupMessage.classList.remove('popup-hidden'); // Muestra el pop-up
                    }
                }, 1000); // Retardo de 1 segundo después de la desaparición del preloader
            }, { once: true }); // 'once: true' asegura que el evento se ejecuta solo una vez
        } else {
            // Si por alguna razón el preloader no existe o no se carga,
            // mostrar el pop-up después de un retardo normal de la página
            setTimeout(function() {
                if (popupMessage) {
                    popupMessage.classList.remove('popup-hidden'); // Muestra el pop-up
                }
            }, 2000); // 2 segundos de retardo si no hay preloader
        }
    }, 500); // Retardo de 500 milisegundos para el preloader antes de empezar a desvanecerse

    // Lógica para cerrar el pop-up al hacer clic en la X
    if (closePopup) {
        closePopup.addEventListener('click', function() {
            if (popupMessage) {
                popupMessage.classList.add('popup-hidden'); // Oculta el pop-up
            }
        });
    }

    // Opcional: Lógica para cerrar el pop-up al hacer clic fuera del contenido del pop-up
    if (popupMessage) {
        popupMessage.addEventListener('click', function(event) {
            // Si el clic fue directamente en el fondo del pop-up (no en su contenido interno)
            if (event.target === popupMessage) {
                popupMessage.classList.add('popup-hidden');
            }
        });
    }
});

---

## Lógica Principal de la Aplicación

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // URL de tu backend de Render
    const BACKEND_URL = '[https://guerra-mundial-z-backend.onrender.com](https://guerra-mundial-z-backend.onrender.com)';

    // Referencias a elementos del DOM (autenticación)
    const loginButton = document.getElementById('login-button'); // Tu HTML usa 'login-button'
    const logoutButton = document.getElementById('logout-button'); // Tu HTML usa 'logout-button'
    const userDisplay = document.getElementById('user-display'); // Tu HTML usa 'user-display'
    const userAvatar = document.getElementById('user-avatar');     // Tu HTML usa 'user-avatar'
    const userName = document.getElementById('user-name');         // Tu HTML usa 'user-name'

    // NUEVO: Referencias a elementos de la modal de creación de subastas
    const createAuctionBtn = document.getElementById('create-auction-btn');
    const createAuctionModal = document.getElementById('create-auction-modal');
    const closeButton = createAuctionModal ? createAuctionModal.querySelector('.close-button') : null;
    const createAuctionForm = document.getElementById('create-auction-form');
    const auctionMessage = document.getElementById('auction-message'); // Para mensajes de la modal

    // Referencias para la sección de subastas activas
    const activeAuctionsList = document.getElementById('active-auctions-list');

    // Función para guardar el token JWT
    function setAuthToken(token) {
        if (token) {
            localStorage.setItem('jwt_token', token);
            console.log('Token JWT guardado.');
        } else {
            localStorage.removeItem('jwt_token');
            console.log('Token JWT eliminado.');
        }
    }

    // Función para obtener el token JWT
    function getAuthToken() {
        return localStorage.getItem('jwt_token');
    }

    // Función para verificar si el usuario es administrador
    function isAdmin(userRoles) {
        return userRoles && userRoles.includes('admin');
    }

    // Función para verificar el estado de la sesión y actualizar la UI
    async function checkSession() {
        const token = getAuthToken();

        if (!token) {
            console.log('No hay token JWT en localStorage.');
            showLoggedOutState();
            if (createAuctionBtn) createAuctionBtn.style.display = 'none'; // Ocultar botón de crear subasta
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.loggedIn) {
                console.log('Sesión JWT verificada: Usuario logueado.', data.username);
                showLoggedInState(data.username, data.avatar, data.id, data.roles);

                // Mostrar/ocultar el botón de crear subasta
                if (createAuctionBtn) {
                    if (isAdmin(data.roles)) {
                        createAuctionBtn.style.display = 'block';
                    } else {
                        createAuctionBtn.style.display = 'none';
                    }
                }
            } else {
                console.log('Sesión JWT no válida o expirada.');
                setAuthToken(null); // Limpiar token inválido
                showLoggedOutState();
                if (createAuctionBtn) createAuctionBtn.style.display = 'none'; // Ocultar botón de crear subasta
            }
        } catch (error) {
            console.error('Error al verificar sesión con JWT:', error);
            setAuthToken(null); // Limpiar token en caso de error de red o servidor
            showLoggedOutState();
            if (createAuctionBtn) createAuctionBtn.style.display = 'none'; // Ocultar botón de crear subasta
        }
    }

    // Función para mostrar el estado de logueado
    function showLoggedInState(username, avatarHash, userId, roles) {
        if (loginButton) loginButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'block';
        if (userDisplay) userDisplay.style.display = 'flex';

        if (userName) userName.textContent = username;

        // Construye la URL del avatar de Discord
        let avatarUrl = '';
        if (userId && avatarHash) {
            avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
        } else {
            const defaultAvatarIndex = (userId ? parseInt(userId) : 0) % 5;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        }

        if (userAvatar) userAvatar.src = avatarUrl;
    }

    // Función para mostrar el estado de no logueado
    function showLoggedOutState() {
        if (loginButton) loginButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';
        if (userDisplay) userDisplay.style.display = 'none';
        if (userName) userName.textContent = '';
        if (userAvatar) userAvatar.src = '';
    }

    // Manejar el clic del botón de inicio de sesión (redirige a tu backend)
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            window.location.href = `${BACKEND_URL}/auth/discord`;
        });
    }

    // Manejar el clic del botón de cierre de sesión
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            setAuthToken(null); // Eliminar el token JWT
            showLoggedOutState(); // Actualizar la UI
            if (createAuctionBtn) createAuctionBtn.style.display = 'none'; // Ocultar botón de crear subasta
            console.log('Sesión cerrada (token JWT eliminado del cliente).');
            // Redirigir a la misma página para limpiar la URL de cualquier token anterior.
            window.location.href = window.location.origin + window.location.pathname;
        });
    }

    // Cuando la página carga, verificar si hay un token en la URL o en localStorage
    // Nota: window.addEventListener('load') ya maneja esto, pero DOMContentLoaded es más rápido para elementos del DOM
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        setAuthToken(token); // Guardar el token del URL
        // Limpiar la URL para que el token no sea visible ni guardado en el historial
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('Token JWT recibido y guardado desde la URL.');
    }
    checkSession(); // Verificar la sesión después de manejar el token
    fetchAuctions(); // Cargar las subastas al cargar la página

    ---

    ## Lógica de la Modal de Creación de Subastas

    ```javascript
    // Abrir la modal al hacer clic en el botón "Crear Nueva Subasta"
    if (createAuctionBtn) {
        createAuctionBtn.addEventListener('click', () => {
            if (createAuctionModal) {
                createAuctionModal.style.display = 'flex'; // Usamos flex para centrar
                // Opcional: limpiar el formulario si se reabre
                if (createAuctionForm) createAuctionForm.reset();
                if (auctionMessage) {
                    auctionMessage.style.display = 'none';
                    auctionMessage.className = 'message'; // Resetear clases de mensaje
                }
            }
        });
    }

    // Cerrar la modal con la 'x'
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (createAuctionModal) {
                createAuctionModal.style.display = 'none';
            }
        });
    }

    // Cerrar la modal si se hace clic fuera del contenido
    if (createAuctionModal) {
        window.addEventListener('click', (event) => {
            if (event.target === createAuctionModal) {
                createAuctionModal.style.display = 'none';
            }
        });
    }

    // Función para mostrar mensajes dentro de la modal
    function showAuctionFormMessage(message, type) {
        if (auctionMessage) {
            auctionMessage.textContent = message;
            auctionMessage.className = `message ${type}`;
            auctionMessage.style.display = 'block';
            setTimeout(() => {
                auctionMessage.style.display = 'none';
            }, 3000); // Ocultar mensaje después de 3 segundos
        }
    }

    // Manejar el envío del formulario de creación de subastas (solo admin)
    if (createAuctionForm) {
        createAuctionForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Evitar el envío por defecto del formulario

            const title = document.getElementById('auction-title').value;
            const description = document.getElementById('auction-description').value;
            const imageUrl = document.getElementById('auction-image-url').value; // Usar auction-image-url
            const startBid = parseFloat(document.getElementById('auction-start-bid').value);
            const endDate = document.getElementById('auction-end-date').value; // Formato YYYY-MM-DDTHH:MM

            const token = getAuthToken();

            if (!token) {
                showAuctionFormMessage('Debes iniciar sesión como administrador para crear subastas.', 'error');
                return;
            }

            // Validaciones básicas
            if (!title || !description || isNaN(startBid) || startBid < 0 || !endDate) {
                showAuctionFormMessage('Por favor, completa todos los campos obligatorios (título, descripción, puja inicial, fecha de finalización).', 'error');
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions/admin`, { // Endpoint correcto para admin
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, description, imageUrl, startBid, endDate })
                });

                const result = await response.json();

                if (response.ok) {
                    showAuctionFormMessage('Subasta creada con éxito!', 'success');
                    createAuctionForm.reset(); // Limpiar el formulario
                    // Opcional: cerrar la modal después de un tiempo o forzar actualización de la lista
                    setTimeout(() => {
                        if (createAuctionModal) createAuctionModal.style.display = 'none';
                        fetchAuctions(); // Recargar las subastas para mostrar la nueva
                    }, 2000);
                } else {
                    showAuctionFormMessage(`Error al crear subasta: ${result.message || 'Error desconocido'}`, 'error');
                }
            } catch (error) {
                console.error('Error de red al crear subasta:', error);
                showAuctionFormMessage('Error de red al crear subasta. Inténtalo de nuevo.', 'error');
            }
        });
    }

    ---

    ## Lógica de Visualización y Puja de Subastas

    ```javascript
    async function fetchAuctions() {
        if (!activeAuctionsList) {
            console.error("Elemento 'active-auctions-list' no encontrado en el HTML.");
            return;
        }
        activeAuctionsList.innerHTML = '<p>Cargando subastas...</p>';

        try {
            const response = await fetch(`${BACKEND_URL}/api/auctions`); // Obtener todas las subastas
            const auctions = await response.json();

            renderAuctions(auctions); // Renderizar las subastas
        } catch (error) {
            console.error('Error al cargar las subastas:', error);
            activeAuctionsList.innerHTML = '<p class="message error">Error al cargar las subastas. Inténtalo de nuevo más tarde.</p>';
        }
    }

    function renderAuctions(auctions) {
        if (!activeAuctionsList) return; // Asegurarse de que el elemento exista

        if (auctions.length === 0) {
            activeAuctionsList.innerHTML = '<p>No hay subastas activas en este momento. ¡Vuelve pronto!</p>';
            return;
        }

        activeAuctionsList.innerHTML = ''; // Limpiar el contenido existente
        auctions.forEach(auction => {
            const auctionCard = document.createElement('div');
            auctionCard.classList.add('auction-card');
            auctionCard.innerHTML = `
                <img src="${auction.imageUrl || '[https://via.placeholder.com/150](https://via.placeholder.com/150)'}" alt="${auction.title}">
                <h3>${auction.title}</h3>
                <p>${auction.description}</p>
                <p>Puja Actual: <strong>${auction.currentBid} Rublos</strong> (por ${auction.currentBidderName || 'Nadie'})</p>
                <p>Finaliza en: <span class="countdown" data-end-date="${auction.endDate}"></span></p>
                <div class="bid-controls">
                    <input type="number" class="bid-input" placeholder="Tu puja" min="${auction.currentBid + 1}" step="1" data-auction-id="${auction._id}">
                    <button class="button bid-button" data-auction-id="${auction._id}">Pujar</button>
                    <p class="bid-message" id="bid-message-${auction._id}" style="display:none;"></p>
                </div>
            `;
            activeAuctionsList.appendChild(auctionCard);
        });

        // Iniciar los temporizadores de cuenta regresiva
        startCountdowns();

        // Añadir event listeners a los botones de pujar después de renderizar
        document.querySelectorAll('.bid-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const auctionId = e.target.dataset.auctionId;
                const bidInput = document.querySelector(`.bid-input[data-auction-id="${auctionId}"]`);
                const bidAmount = parseFloat(bidInput.value);
                const bidMessageElement = document.getElementById(`bid-message-${auctionId}`);

                const token = getAuthToken();
                if (!token) {
                    showBidMessage(bidMessageElement, 'Por favor, inicia sesión para pujar.', 'error');
                    return;
                }
                if (isNaN(bidAmount) || bidAmount <= 0) {
                    showBidMessage(bidMessageElement, 'Ingresa una cantidad de puja válida.', 'error');
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
                        showBidMessage(bidMessageElement, '¡Puja realizada con éxito!', 'success');
                        // Actualizar la subasta en la UI o recargar todas las subastas
                        setTimeout(fetchAuctions, 1000); // Recargar después de 1 segundo
                    } else {
                        showBidMessage(bidMessageElement, `Error al pujar: ${result.message || 'Error desconocido'}`, 'error');
                    }
                } catch (error) {
                    console.error('Error de red al pujar:', error);
                    showBidMessage(bidMessageElement, 'Error de red. Intenta de nuevo.', 'error');
                }
            });
        });
    }

    // Función para mostrar mensajes de puja
    function showBidMessage(element, message, type) {
        element.textContent = message;
        element.className = `bid-message ${type}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000); // Ocultar mensaje después de 3 segundos
    }

    // Función para iniciar la cuenta regresiva de las subastas
    function startCountdowns() {
        document.querySelectorAll('.countdown').forEach(countdownElement => {
            const endDate = new Date(countdownElement.dataset.endDate).getTime();

            const updateCountdown = () => {
                const now = new Date().getTime();
                const distance = endDate - now;

                if (distance < 0) {
                    countdownElement.innerHTML = '¡Finalizada!';
                    // Puedes deshabilitar botones de pujar para subastas finalizadas aquí
                    const bidButton = countdownElement.closest('.auction-card').querySelector('.bid-button');
                    const bidInput = countdownElement.closest('.auction-card').querySelector('.bid-input');
                    if (bidButton) bidButton.disabled = true;
                    if (bidInput) bidInput.disabled = true;
                    clearInterval(countdownElement.intervalId); // Detener el intervalo
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            };

            // Limpiar cualquier intervalo anterior para evitar múltiples contadores
            if (countdownElement.intervalId) {
                clearInterval(countdownElement.intervalId);
            }

            updateCountdown(); // Actualizar inmediatamente
            countdownElement.intervalId = setInterval(updateCountdown, 1000); // Actualizar cada segundo
        });
    }
});