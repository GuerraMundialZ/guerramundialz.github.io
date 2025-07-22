// La lógica del preloader y el popup se ha eliminado.
// El código se iniciará directamente al cargar el DOM.

document.addEventListener('DOMContentLoaded', () => {
    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com';

    // Referencias a elementos del DOM (autenticación)
    // Se ha cambiado 'login-button' a 'loginButton' para que coincida con admin.html
    const loginButton = document.getElementById('loginButton'); 
    const logoutButton = document.getElementById('logoutButton');
    // Renombrado de 'user-display' a 'userInfo' para que coincida con admin.html
    const userInfo = document.getElementById('userInfo'); 
    const userAvatar = document.getElementById('userAvatar'); // Renombrado
    const usernameDisplay = document.getElementById('usernameDisplay'); // Renombrado

    // Referencias a elementos del header para el panel de administración
    // NOTA: El botón 'create-auction-btn' de tu original script.js se ha renombrado a 'createAuctionBtn'
    // y su rol principal ahora es para abrir el modal genérico (crear o editar).
    // Tu admin.html tiene un #createAuctionBtn que ahora usaremos para abrir el modal en modo creación.
    const createAuctionBtn = document.getElementById('createAuctionBtn'); // Este es el del header

    // --- INICIO DE CAMBIOS PARA ADMIN PANEL ---
    // Referencias a elementos del DOM específicos de admin.html
    const adminPanelBtn = document.getElementById('adminPanelBtn'); // El botón "Panel Admin" del header

    // Elementos de la lista de subastas en el panel de admin
    const adminAuctionList = document.getElementById('adminAuctionList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noAuctionsMessage = document.getElementById('noAuctionsMessage');

    // Elementos del modal de edición/creación (el #editAuctionModal de admin.html)
    const editAuctionModal = document.getElementById('editAuctionModal');
    // Renombrado de closeButton a closeEditModalButton para evitar conflicto con el original `closeButton`
    // También se usa la función closeEditModal() en el onclick del HTML, así que no es estrictamente necesario,
    // pero lo dejamos referenciado por si se necesita JS para cerrar.
    const closeEditModalButton = editAuctionModal ? editAuctionModal.querySelector('.close-button') : null;
    const editAuctionForm = document.getElementById('editAuctionForm');

    const editAuctionId = document.getElementById('editAuctionId');
    const editTitle = document.getElementById('editTitle');
    const editDescription = document.getElementById('editDescription');
    const editImageUrl = document.getElementById('editImageUrl');
    const editStartBid = document.getElementById('editStartBid');
    const editEndDate = document.getElementById('editEndDate');

    // Función global para cerrar el modal de edición/creación (llamada desde el HTML)
    window.closeEditModal = function() {
        if (editAuctionModal) {
            editAuctionModal.style.display = 'none';
            editAuctionForm.reset(); // Limpiar el formulario al cerrar
            // Limpiar mensajes de error/éxito del formulario si los hubiera
            const formMessage = editAuctionForm.querySelector('.message');
            if (formMessage) formMessage.style.display = 'none';
        }
    };
    // --- FIN DE CAMBIOS PARA ADMIN PANEL ---


    // Referencias para la sección de subastas activas (en subastas.html)
    const activeAuctionsList = document.getElementById('active-auctions-list'); // Este es para subastas.html


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

    function isAdmin(userRoles) {
        // **¡IMPORTANTE!**
        // Reemplaza '1397175186935255091' con los IDs reales de los roles de Discord
        // que deseas que tengan permisos de administrador en tu sitio web.
        // Puedes añadir múltiples IDs de rol si tienes varios roles de administrador.
        // Ejemplo: ['ID_ROL_ADMIN_1', 'ID_ROL_ADMIN_2', 'OTRO_ROL_ADMIN']
        const ADMIN_DISCORD_ROLE_IDS = [
            '1397175186935255091', // Tu ID de rol de administrador de Discord
            // 'AGREGA_OTRA_ID_DE_ROL_AQUI_SI_ES_NECESARIO',
        ];

        // userRoles debe ser un array de strings (IDs de rol de Discord) que el backend enviará.
        if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
            return false;
        }

        // Verifica si el usuario tiene AL MENOS UNO de los roles definidos en ADMIN_DISCORD_ROLE_IDS.
        return userRoles.some(roleId => ADMIN_DISCORD_ROLE_IDS.includes(roleId));
    }

    // Función para verificar el estado de la sesión y actualizar la UI
    async function checkSession() {
        const token = getAuthToken();

        if (!token) {
            console.log('No hay token JWT en localStorage.');
            showLoggedOutState();
            // --- INICIO DE CAMBIOS PARA ADMIN PANEL ---
            if (createAuctionBtn) createAuctionBtn.style.display = 'none'; // Ocultar botón de crear subasta en el header
            if (adminPanelBtn) adminPanelBtn.style.display = 'none'; // Ocultar botón Panel Admin
            // --- FIN DE CAMBIOS PARA ADMIN PANEL ---
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
                // Asegúrate de que `data.roles` del backend contiene el array de IDs de rol de Discord del usuario
                showLoggedInState(data.username, data.avatar, data.id, data.roles);

                // --- INICIO DE CAMBIOS PARA ADMIN PANEL ---
                // Mostrar/ocultar los botones de crear subasta y panel admin
                if (isAdmin(data.roles)) {
                    if (createAuctionBtn) createAuctionBtn.style.display = 'inline-block'; // 'block' o 'inline-block' según tu CSS
                    if (adminPanelBtn) adminPanelBtn.style.display = 'inline-block';
                    // Si estamos en admin.html y el usuario es admin, cargar las subastas de admin
                    if (window.location.pathname.includes('admin.html')) {
                        loadAdminAuctions();
                    }
                } else {
                    if (createAuctionBtn) createAuctionBtn.style.display = 'none';
                    if (adminPanelBtn) adminPanelBtn.style.display = 'none';
                    // Si el usuario no es admin y está en admin.html, mostrar mensaje de error o redirigir
                    if (window.location.pathname.includes('admin.html') && adminAuctionList) {
                        adminAuctionList.innerHTML = '<p class="error-message">No tienes permisos para acceder a esta sección.</p>';
                        if (loadingMessage) loadingMessage.style.display = 'none';
                        if (noAuctionsMessage) noAuctionsMessage.style.display = 'none';
                    }
                }
                // --- FIN DE CAMBIOS PARA ADMIN PANEL ---

            } else {
                console.log('Sesión JWT no válida o expirada.');
                setAuthToken(null); // Limpiar token inválido
                showLoggedOutState();
                // --- INICIO DE CAMBIOS PARA ADMIN PANEL ---
                if (createAuctionBtn) createAuctionBtn.style.display = 'none';
                if (adminPanelBtn) adminPanelBtn.style.display = 'none';
                // Si el usuario está en admin.html y la sesión no es válida
                if (window.location.pathname.includes('admin.html') && adminAuctionList) {
                    adminAuctionList.innerHTML = '<p class="error-message">Por favor, inicia sesión como administrador para ver este panel.</p>';
                    if (loadingMessage) loadingMessage.style.display = 'none';
                    if (noAuctionsMessage) noAuctionsMessage.style.display = 'none';
                }
                // --- FIN DE CAMBIOS PARA ADMIN PANEL ---
            }
        } catch (error) {
            console.error('Error al verificar sesión con JWT:', error);
            setAuthToken(null); // Limpiar token en caso de error de red o servidor
            showLoggedOutState();
            // --- INICIO DE CAMBIOS PARA ADMIN PANEL ---
            if (createAuctionBtn) createAuctionBtn.style.display = 'none';
            if (adminPanelBtn) adminPanelBtn.style.display = 'none';
            if (window.location.pathname.includes('admin.html') && adminAuctionList) {
                adminAuctionList.innerHTML = '<p class="error-message">Error de conexión al verificar permisos.</p>';
                if (loadingMessage) loadingMessage.style.display = 'none';
                if (noAuctionsMessage) noAuctionsMessage.style.display = 'none';
            }
            // --- FIN DE CAMBIOS PARA ADMIN PANEL ---
        }
    }

    // Función para mostrar el estado de logueado
    function showLoggedInState(username, avatarHash, userId, roles) {
        if (loginButton) loginButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'block';
        // Renombrado userDisplay a userInfo para que coincida con admin.html
        if (userInfo) userInfo.style.display = 'flex'; 

        if (usernameDisplay) usernameDisplay.textContent = username; // Renombrado

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
        // Renombrado userDisplay a userInfo
        if (userInfo) userInfo.style.display = 'none'; 
        if (usernameDisplay) usernameDisplay.textContent = ''; // Renombrado
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
            // --- INICIO DE CAMBIOS PARA ADMIN PANEL ---
            if (createAuctionBtn) createAuctionBtn.style.display = 'none'; // Ocultar botón de crear subasta
            if (adminPanelBtn) adminPanelBtn.style.display = 'none'; // Ocultar botón Panel Admin
            // Si el usuario está en admin.html, limpia el contenido o redirige
            if (window.location.pathname.includes('admin.html') && adminAuctionList) {
                adminAuctionList.innerHTML = '<p class="error-message">Sesión cerrada. Inicia sesión como administrador para ver este panel.</p>';
            }
            // --- FIN DE CAMBIOS PARA ADMIN PANEL ---
            console.log('Sesión cerrada (token JWT eliminado del cliente).');
            // Redirigir a la misma página para limpiar la URL de cualquier token anterior.
            window.location.href = window.location.origin + window.location.pathname;
        });
    }

    // Cuando la página carga, verificar si hay un token en la URL o en localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        setAuthToken(token); // Guardar el token del URL
        // Limpiar la URL para que el token no sea visible ni guardado en el historial
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('Token JWT recibido y guardado desde la URL.');
    }
    checkSession(); // Verificar la sesión después de manejar el token
    
    // Solo cargar subastas activas si no estamos en el panel de administración
    if (!window.location.pathname.includes('admin.html')) {
        fetchAuctions(); // Cargar las subastas al cargar la página
    }


    // --- INICIO DE CAMBIOS PARA EL SCROLL SUAVE ---
    document.querySelectorAll('.header nav ul li a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault(); // Evita el comportamiento de desplazamiento predeterminado del navegador

            const targetId = this.getAttribute('href'); // Obtiene el ID del ancla (ej: "#caracteristicas")
            const targetElement = document.querySelector(targetId); // Obtiene el elemento de la sección

            if (targetElement) {
                const header = document.querySelector('header'); // Selecciona tu encabezado (cambiado de .header a header)
                // Obtiene la altura calculada del header. Según tus capturas, es ~206.25px.
                // Usamos 210px para asegurar que el título no quede cortado y tenga un pequeño margen.
                const headerHeight = header ? header.offsetHeight : 0;

                // Calcula la posición a la que debe desplazarse
                // offsetTop es la distancia del elemento al top del documento
                // Le restamos la altura del header para que se detenga justo debajo de él
                const targetPosition = targetElement.offsetTop - headerHeight; // Ya no resta los 10px adicionales

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth' // Desplazamiento suave
                });
            }
        });
    });
    // --- FIN DE CAMBIOS PARA EL SCROLL SUAVE ---

    // --- INICIO DE CAMBIOS PARA ADMIN PANEL (Modal de Creación/Edición) ---
    // Manejo de la modal de creación/edición (ahora es la misma modal)
    // El botón 'createAuctionBtn' en el header abre el modal en modo creación
    if (createAuctionBtn) {
        createAuctionBtn.addEventListener('click', () => openEditModal()); // Abre el modal en modo creación
    }

    // Listener para cerrar el modal haciendo clic en la 'x'
    if (closeEditModalButton) {
        closeEditModalButton.addEventListener('click', closeEditModal);
    }

    // Cerrar la modal si se hace clic fuera del contenido
    if (editAuctionModal) {
        window.addEventListener('click', (event) => {
            if (event.target === editAuctionModal) {
                closeEditModal();
            }
        });
    }

    // Función para mostrar mensajes dentro del formulario del modal
    function showFormMessage(formElement, message, type) {
        const messageElement = formElement.querySelector('.form-message') || document.createElement('p');
        if (!messageElement.classList.contains('form-message')) { // Añade la clase si no existe
            messageElement.classList.add('form-message');
            formElement.prepend(messageElement); // Inserta al inicio del formulario
        }
        messageElement.textContent = message;
        messageElement.className = `form-message ${type}`;
        messageElement.style.display = 'block';
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000); // Ocultar mensaje después de 3 segundos
    }

    // Manejar el envío del formulario de edición/creación (POST o PUT)
    if (editAuctionForm) {
        editAuctionForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const id = editAuctionId.value;
            const isEditing = !!id; // True si hay ID, False si es nueva
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing ? `${BACKEND_URL}/api/auctions/${id}` : `${BACKEND_URL}/api/admin`;

            const token = getAuthToken();

            if (!token) {
                showFormMessage(editAuctionForm, 'Debes iniciar sesión para realizar esta acción.', 'error');
                return;
            }

            const formData = new FormData(editAuctionForm);
            const data = Object.fromEntries(formData.entries());

            // Convertir startBid a número, y endDate a formato Date
            data.startBid = parseFloat(data.startBid);
            data.endDate = new Date(data.endDate).toISOString(); // Backend espera ISO string

            // Si es edición, el backend ya tiene currentBid y bidder, no los necesitamos del form
            // Si quisieras que el admin pudiera cambiar currentBid manualmente, necesitarías un input adicional en el form
            // y enviarlo en el 'data' object. Para este caso, solo enviamos lo que está en el HTML del modal.

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showFormMessage(editAuctionForm, result.message || `Subasta ${isEditing ? 'actualizada' : 'creada'} con éxito!`, 'success');
                    editAuctionForm.reset();
                    setTimeout(() => {
                        closeEditModal();
                        loadAdminAuctions(); // Recargar la lista de subastas en el panel de admin
                    }, 1000); // Esperar un momento antes de cerrar y recargar
                } else {
                    showFormMessage(editAuctionForm, result.message || `Error al ${isEditing ? 'actualizar' : 'crear'} subasta.`, 'error');
                    console.error(`Error al ${isEditing ? 'actualizar' : 'crear'} subasta:`, result);
                }
            } catch (error) {
                console.error('Error de red al enviar subasta:', error);
                showFormMessage(editAuctionForm, 'Error de conexión. Inténtalo de nuevo.', 'error');
            }
        });
    }

    // Función para renderizar una sola tarjeta de subasta en el panel de admin
    function renderAdminAuctionCard(auction) {
        const card = document.createElement('div');
        card.className = 'auction-card admin-card'; // Usa la clase admin-card para estilos específicos
        card.dataset.id = auction._id;

        const endDate = new Date(auction.endDate);
        const formattedEndDate = endDate.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });
        const discordTimestamp = Math.floor(endDate.getTime() / 1000);

        card.innerHTML = `
            <img src="${auction.imageUrl || 'https://via.placeholder.com/300'}" alt="${auction.title}">
            <h3>${auction.title}</h3>
            <p>${auction.description}</p>
            <p><strong>Puja Inicial:</strong> ${auction.startBid} Rublos</p>
            <p><strong>Puja Actual:</strong> ${auction.currentBid} Rublos</p>
            <p><strong>Pujador Actual:</strong> ${auction.currentBidderName || 'Nadie'}</p>
            <p><strong>Finaliza:</strong> ${formattedEndDate} (<t:${discordTimestamp}:R>)</p>
            <div class="admin-actions">
                <button class="edit-btn button" data-id="${auction._id}">Editar</button>
                <button class="delete-btn button" data-id="${auction._id}">Eliminar</button>
            </div>
        `;

        card.querySelector('.edit-btn').addEventListener('click', () => {
            // Asegúrate de pasar el objeto auction completo
            openEditModal(auction); 
        });
        card.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm(`¿Estás seguro de que quieres eliminar la subasta "${auction.title}"?`)) {
                deleteAuction(auction._id);
            }
        });

        return card;
    }

    // Función para cargar todas las subastas en el panel de administración
    async function loadAdminAuctions() {
        if (!adminAuctionList) return; // No hacer nada si no estamos en admin.html

        loadingMessage.style.display = 'block';
        adminAuctionList.innerHTML = ''; // Limpiar lista
        noAuctionsMessage.style.display = 'none';

        try {
            const token = getAuthToken();
            if (!token) {
                adminAuctionList.innerHTML = '<p class="error-message">No estás autenticado. Por favor, inicia sesión.</p>';
                return;
            }

            const response = await fetch(`${BACKEND_URL}/api/admin`, { // Ruta para obtener TODAS las subastas para el admin
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const auctions = await response.json();
                if (auctions.length > 0) {
                    auctions.forEach(auction => {
                        adminAuctionList.appendChild(renderAdminAuctionCard(auction));
                    });
                } else {
                    noAuctionsMessage.style.display = 'block';
                }
            } else if (response.status === 401 || response.status === 403) {
                adminAuctionList.innerHTML = '<p class="error-message">No tienes permiso para ver este panel. Por favor, inicia sesión como administrador.</p>';
                console.error('Acceso denegado al panel de administración.');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al cargar las subastas de administración.');
            }
        } catch (error) {
            console.error('Error al cargar subastas del panel de administración:', error);
            adminAuctionList.innerHTML = `<p class="error-message">Error al cargar las subastas: ${error.message}</p>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    // Función para eliminar una subasta
    async function deleteAuction(id) {
        const token = getAuthToken();
        if (!token) {
            alert('Debes iniciar sesión para realizar esta acción.');
            return;
        }
        try {
            const response = await fetch(`${BACKEND_URL}/api/auctions/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || 'Subasta eliminada con éxito.');
                loadAdminAuctions(); // Recargar la lista de subastas después de eliminar
            } else {
                alert(`Error al eliminar subasta: ${result.message || 'Error desconocido'}`);
                console.error('Error al eliminar subasta:', result);
            }
        } catch (error) {
            console.error('Error de red al eliminar subasta:', error);
            alert('Error de conexión al eliminar subasta. Inténtalo de nuevo.');
        }
    }
    // --- FIN DE CAMBIOS PARA ADMIN PANEL ---

    // Lógica de Visualización y Puja de Subastas (Para subastas.html)
    async function fetchAuctions() {
        if (!activeAuctionsList) {
            // Este console.error solo aparecerá si fetchAuctions() es llamado
            // en una página donde activeAuctionsList no existe (ej. admin.html).
            // Esto es normal si fetchAuctions es para subastas.html.
            // La llamada se ha movido dentro del DOMContentLoaded para ser condicional.
            return; 
        }
        activeAuctionsList.innerHTML = '<p>Cargando subastas...</p>';

        try {
            const response = await fetch(`${BACKEND_URL}/api/auctions`);
            const auctions = await response.json();

            renderAuctions(auctions);
        } catch (error) {
            console.error('Error al cargar las subastas:', error);
            activeAuctionsList.innerHTML = '<p class="message error">Error al cargar las subastas. Inténtalo de nuevo más tarde.</p>';
        }
    }

    function renderAuctions(auctions) {
        if (!activeAuctionsList) return;

        if (auctions.length === 0) {
            activeAuctionsList.innerHTML = '<p>No hay subastas activas en este momento. ¡Vuelve pronto!</p>';
            return;
        }

        activeAuctionsList.innerHTML = '';
        auctions.forEach(auction => {
            const auctionCard = document.createElement('div');
            auctionCard.classList.add('auction-card');
            auctionCard.innerHTML = `
                <img src="${auction.imageUrl || 'https://via.placeholder.com/300'}" alt="${auction.title}">
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

        startCountdowns();

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
                        setTimeout(fetchAuctions, 1000); // Recargar subastas después de un segundo
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

    function showBidMessage(element, message, type) {
        element.textContent = message;
        element.className = `bid-message ${type}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }

    function startCountdowns() {
        document.querySelectorAll('.countdown').forEach(countdownElement => {
            const endDate = new Date(countdownElement.dataset.endDate).getTime();

            const updateCountdown = () => {
                const now = new Date().getTime();
                const distance = endDate - now;

                if (distance < 0) {
                    countdownElement.innerHTML = '¡Finalizada!';
                    const bidButton = countdownElement.closest('.auction-card').querySelector('.bid-button');
                    const bidInput = countdownElement.closest('.auction-card').querySelector('.bid-input');
                    if (bidButton) bidButton.disabled = true;
                    if (bidInput) bidInput.disabled = true;
                    clearInterval(countdownElement.intervalId);
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            };

            if (countdownElement.intervalId) {
                clearInterval(countdownElement.intervalId);
            }

            updateCountdown();
            countdownElement.intervalId = setInterval(updateCountdown, 1000);
        });
    }
});