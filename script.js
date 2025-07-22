// La lógica del preloader y el popup se ha eliminado.
// El código se iniciará directamente al cargar el DOM.

document.addEventListener('DOMContentLoaded', () => {
    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com';

    // --- Referencias a elementos del DOM (Autenticación y Navegación) ---
    // Asegúrate de que los IDs aquí coincidan exactamente con tu HTML
    const loginButton = document.getElementById('loginButton'); // Botón "Iniciar Sesión"
    const logoutButton = document.getElementById('logoutButton'); // Botón "Cerrar Sesión"
    const userInfo = document.getElementById('userInfo'); // Contenedor para info de usuario logueado
    const userAvatar = document.getElementById('userAvatar'); // Imagen del avatar
    const usernameDisplay = document.getElementById('usernameDisplay'); // Nombre de usuario

    // Botones de navegación para usuarios logueados (visibilidad controlada por JS)
    const createAuctionBtn = document.getElementById('createAuctionBtn'); // Botón "Crear Nueva Subasta" en la nav
    const adminPanelBtn = document.getElementById('adminPanelBtn'); // Botón "Panel Admin" en la nav

    // --- Referencias a elementos del DOM (Paneles de Contenido) ---
    // Para la página de subastas (subastas.html)
    const activeAuctionsList = document.getElementById('active-auctions-list');

    // Para la página de administración (admin.html)
    const adminAuctionList = document.getElementById('adminAuctionList'); // Contenedor de subastas en el panel admin
    const loadingMessage = document.getElementById('loadingMessage'); // Mensaje de carga en admin panel
    const noAuctionsMessage = document.getElementById('noAuctionsMessage'); // Mensaje de no subastas en admin panel

    // --- Referencias a elementos del DOM (Modal de Creación/Edición en admin.html) ---
    const editAuctionModal = document.getElementById('editAuctionModal');
    const closeEditModalButton = editAuctionModal ? editAuctionModal.querySelector('.close-button') : null;
    const editAuctionForm = document.getElementById('editAuctionForm');
    const editAuctionId = document.getElementById('editAuctionId'); // Campo oculto para el ID de la subasta a editar
    const editTitle = document.getElementById('editTitle');
    const editDescription = document.getElementById('editDescription');
    const editImageUrl = document.getElementById('editImageUrl');
    const editStartBid = document.getElementById('editStartBid');
    const editEndDate = document.getElementById('editEndDate');

    // --- Variables Auxiliares ---
    // Variable para controlar el intervalo de actualización del contador (lo haremos global para limpiarlo bien)
    let countdownIntervals = {};

    // --- Funciones de Utilidad de Autenticación ---

    function setAuthToken(token) {
        if (token) {
            localStorage.setItem('jwt_token', token);
            console.log('Token JWT guardado.');
        } else {
            localStorage.removeItem('jwt_token');
            console.log('Token JWT eliminado.');
        }
    }

    function getAuthToken() {
        return localStorage.getItem('jwt_token');
    }

    // `isAdmin` verifica si el usuario tiene alguno de los roles de Discord listados
    function isAdmin(userRoles) {
        const ADMIN_DISCORD_ROLE_IDS = [
            '1397175186935255091', // Tu ID de rol de administrador de Discord
            // Agrega más IDs de rol si tienes otros roles de admin
        ];

        if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
            return false;
        }
        return userRoles.some(roleId => ADMIN_DISCORD_ROLE_IDS.includes(roleId));
    }

    // `updateAuthUI` actualiza el estado visual de la UI según si el usuario está logueado y su rol
    async function updateAuthUI() {
        const token = getAuthToken();

        if (!token) {
            showLoggedOutState();
            // Ocultar botones de administración si no hay token
            if (createAuctionBtn) createAuctionBtn.style.display = 'none';
            if (adminPanelBtn) adminPanelBtn.style.display = 'none';
            // Si estamos en admin.html y no hay token, mostrar mensaje de acceso denegado
            if (window.location.pathname.includes('admin.html') && adminAuctionList) {
                adminAuctionList.innerHTML = '<p class="error-message">Por favor, inicia sesión como administrador para ver este panel.</p>';
                if (loadingMessage) loadingMessage.style.display = 'none';
                if (noAuctionsMessage) noAuctionsMessage.style.display = 'none';
            }
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.loggedIn) {
                console.log('Sesión JWT verificada:', data.username);
                showLoggedInState(data.username, data.avatar, data.id);

                // Control de visibilidad de botones de admin
                if (isAdmin(data.roles)) {
                    if (createAuctionBtn) createAuctionBtn.style.display = 'inline-block';
                    if (adminPanelBtn) adminPanelBtn.style.display = 'inline-block';
                    // Si estamos en admin.html y el usuario es admin, cargar las subastas del panel
                    if (window.location.pathname.includes('admin.html')) {
                        loadAdminAuctions();
                    }
                } else {
                    // Si el usuario está logueado pero NO es admin
                    if (createAuctionBtn) createAuctionBtn.style.display = 'none';
                    if (adminPanelBtn) adminPanelBtn.style.display = 'none';
                    if (window.location.pathname.includes('admin.html') && adminAuctionList) {
                        adminAuctionList.innerHTML = '<p class="error-message">No tienes permisos para acceder a esta sección.</p>';
                        if (loadingMessage) loadingMessage.style.display = 'none';
                        if (noAuctionsMessage) noAuctionsMessage.style.display = 'none';
                    }
                }
            } else {
                console.log('Sesión JWT no válida o expirada.');
                setAuthToken(null);
                showLoggedOutState();
                if (createAuctionBtn) createAuctionBtn.style.display = 'none';
                if (adminPanelBtn) adminPanelBtn.style.display = 'none';
                if (window.location.pathname.includes('admin.html') && adminAuctionList) {
                    adminAuctionList.innerHTML = '<p class="error-message">Sesión inválida. Por favor, inicia sesión como administrador.</p>';
                    if (loadingMessage) loadingMessage.style.display = 'none';
                    if (noAuctionsMessage) noAuctionsMessage.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error al verificar sesión con JWT:', error);
            setAuthToken(null);
            showLoggedOutState();
            if (createAuctionBtn) createAuctionBtn.style.display = 'none';
            if (adminPanelBtn) adminPanelBtn.style.display = 'none';
            if (window.location.pathname.includes('admin.html') && adminAuctionList) {
                adminAuctionList.innerHTML = '<p class="error-message">Error de conexión al verificar permisos.</p>';
                if (loadingMessage) loadingMessage.style.display = 'none';
                if (noAuctionsMessage) noAuctionsMessage.style.display = 'none';
            }
        }
    }

    function showLoggedInState(username, avatarHash, userId) {
        if (loginButton) loginButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'block';
        if (userInfo) userInfo.style.display = 'flex';

        if (usernameDisplay) usernameDisplay.textContent = username;

        let avatarUrl = '';
        if (userId && avatarHash) {
            avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
        } else {
            const defaultAvatarIndex = (userId ? parseInt(userId) : 0) % 5;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        }
        if (userAvatar) userAvatar.src = avatarUrl;
    }

    function showLoggedOutState() {
        if (loginButton) loginButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
        if (usernameDisplay) usernameDisplay.textContent = '';
        if (userAvatar) userAvatar.src = '';
    }

    // --- Manejo de Eventos de Autenticación ---

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            window.location.href = `${BACKEND_URL}/auth/discord`;
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            setAuthToken(null);
            updateAuthUI(); // Llama a updateAuthUI para recalcular el estado y visibilidad de botones
            console.log('Sesión cerrada (token JWT eliminado del cliente).');
            // Redirigir a la misma página para limpiar la URL
            window.location.href = window.location.origin + window.location.pathname;
        });
    }

    // --- Lógica de Inicialización General ---

    // Al cargar la página, primero verifica si hay un token en la URL (después de Discord OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
        setAuthToken(tokenFromUrl);
        // Limpiar la URL para que el token no sea visible ni guardado en el historial
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('Token JWT recibido y guardado desde la URL.');
    }
    
    // Luego, verifica el estado de la sesión y actualiza la UI para todas las páginas
    updateAuthUI(); 

    // Cargar subastas activas SOLO si NO estamos en la página de administración
    if (!window.location.pathname.includes('admin.html')) {
        fetchAuctions();
    }

    // --- Lógica del Scroll Suave ---
    document.querySelectorAll('.header nav a[href^="#"]').forEach(anchor => { // Selector más genérico para enlaces de navegación
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const header = document.querySelector('header');
                const headerHeight = header ? header.offsetHeight : 0;

                const targetPosition = targetElement.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- INICIO DE LÓGICA ESPECÍFICA PARA ADMIN PANEL ---

    // Función para abrir el modal de edición/creación
    // `auction` será nulo para crear una nueva, o el objeto de subasta para editar
    function openEditModal(auction = null) {
        editAuctionForm.reset(); // Limpiar el formulario

        // Limpiar cualquier mensaje de error/éxito previo en el formulario
        const formMessage = editAuctionForm.querySelector('.form-message');
        if (formMessage) formMessage.style.display = 'none';

        if (auction) {
            // Modo edición
            document.querySelector('#editAuctionModal h3').textContent = 'Editar Subasta';
            editAuctionId.value = auction._id;
            editTitle.value = auction.title;
            editDescription.value = auction.description;
            editImageUrl.value = auction.imageUrl;
            editStartBid.value = auction.startBid;

            // Formatear la fecha para el input datetime-local (requiere YYYY-MM-DDTHH:mm)
            const endDate = new Date(auction.endDate);
            const year = endDate.getFullYear();
            const month = String(endDate.getMonth() + 1).padStart(2, '0');
            const day = String(endDate.getDate()).padStart(2, '0');
            const hours = String(endDate.getHours()).padStart(2, '0');
            const minutes = String(endDate.getMinutes()).padStart(2, '0');
            editEndDate.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
            // Modo creación
            document.querySelector('#editAuctionModal h3').textContent = 'Crear Nueva Subasta';
            editAuctionId.value = ''; // Asegurarse de que no haya ID para creación
        }
        if (editAuctionModal) editAuctionModal.style.display = 'flex'; // Usamos flex para centrar
    }

    // Función global para cerrar el modal (llamada también por el onclick en HTML)
    window.closeEditModal = function() {
        if (editAuctionModal) {
            editAuctionModal.style.display = 'none';
            editAuctionForm.reset();
            const formMessage = editAuctionForm.querySelector('.form-message');
            if (formMessage) formMessage.style.display = 'none';
        }
    };


    // Listener para el botón "Crear Nueva Subasta" en el header (si existe)
    if (createAuctionBtn) {
        createAuctionBtn.addEventListener('click', () => openEditModal());
    }

    // Listener para cerrar el modal haciendo clic en la 'x'
    if (closeEditModalButton) {
        closeEditModalButton.addEventListener('click', closeEditModal);
    }

    // Cerrar el modal si se hace clic fuera del contenido
    if (editAuctionModal) {
        window.addEventListener('click', (event) => {
            if (event.target === editAuctionModal) {
                closeEditModal();
            }
        });
    }

    // Función para mostrar mensajes dentro del formulario del modal (creado dinámicamente si no existe)
    function showFormMessage(formElement, message, type) {
        let messageElement = formElement.querySelector('.form-message');
        if (!messageElement) {
            messageElement = document.createElement('p');
            messageElement.classList.add('form-message');
            // Insertar el mensaje antes del primer label/input para que esté visible
            formElement.insertBefore(messageElement, formElement.firstChild);
        }
        messageElement.textContent = message;
        messageElement.className = `form-message ${type}`; // Reemplazar clases para el tipo
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

            // Convertir startBid a número, y endDate a formato ISO string
            data.startBid = parseFloat(data.startBid);
            data.endDate = new Date(data.endDate).toISOString();

            // Si es edición, puedes mantener currentBid y bidder si no se modifican
            // o permitir que el backend los actualice si startBid es mayor
            // Por defecto, solo se envían los campos del formulario.

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
                    // Dar tiempo al usuario para leer el mensaje antes de cerrar y recargar
                    setTimeout(() => {
                        closeEditModal();
                        loadAdminAuctions(); // Recargar la lista de subastas en el panel de admin
                    }, 1000);
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

    // Función para renderizar una tarjeta de subasta en el panel de admin
    function renderAdminAuctionCard(auction) {
        const card = document.createElement('div');
        card.className = 'auction-card admin-card'; // Clase para estilos específicos del admin
        card.dataset.id = auction._id; // Almacena el ID para fácil acceso

        const endDate = new Date(auction.endDate);
        const formattedEndDate = endDate.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });
        const discordTimestamp = Math.floor(endDate.getTime() / 1000); // Para formato de tiempo relativo en Discord

        card.innerHTML = `
            <img src="${auction.imageUrl || 'https://via.placeholder.com/300'}" alt="${auction.title}">
            <h3>${auction.title}</h3>
            <p>${auction.description}</p>
            <p><strong>Creada por:</strong> ${auction.creatorName || 'Desconocido'}</p>
            <p><strong>Puja Inicial:</strong> ${auction.startBid} Rublos</p>
            <p><strong>Puja Actual:</strong> ${auction.currentBid} Rublos</p>
            <p><strong>Pujador Actual:</strong> ${auction.currentBidderName || 'Nadie'}</p>
            <p><strong>Estado:</strong> ${auction.status}</p>
            <p><strong>Finaliza:</strong> ${formattedEndDate} (<t:${discordTimestamp}:R>)</p>
            <div class="admin-actions">
                <button class="edit-btn button" data-id="${auction._id}">Editar</button>
                <button class="delete-btn button" data-id="${auction._id}">Eliminar</button>
            </div>
        `;

        // Los Event Listeners se deben añadir a los botones recién creados
        card.querySelector('.edit-btn').addEventListener('click', () => {
            openEditModal(auction); // Pasa el objeto completo para prellenar el formulario
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
        if (!adminAuctionList) return; // Salir si no estamos en admin.html

        loadingMessage.style.display = 'block';
        adminAuctionList.innerHTML = ''; // Limpiar lista existente
        noAuctionsMessage.style.display = 'none';

        try {
            const token = getAuthToken();
            if (!token) {
                adminAuctionList.innerHTML = '<p class="error-message">No estás autenticado. Por favor, inicia sesión.</p>';
                return;
            }

            // Esta ruta `/api/admin` debería devolver TODAS las subastas, activas e inactivas, para el admin
            const response = await fetch(`${BACKEND_URL}/api/admin`, { 
                headers: { 'Authorization': `Bearer ${token}` }
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
                throw new Error(errorData.message || 'Error desconocido al cargar subastas de administración.');
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
        if (!confirm('¿Estás seguro de que quieres eliminar esta subasta? Esta acción es irreversible.')) {
            return; // Cancelar si el usuario no confirma
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/auctions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || 'Subasta eliminada con éxito.');
                loadAdminAuctions(); // Recargar la lista de subastas
            } else {
                alert(`Error al eliminar subasta: ${result.message || 'Error desconocido'}`);
                console.error('Error al eliminar subasta:', result);
            }
        } catch (error) {
            console.error('Error de red al eliminar subasta:', error);
            alert('Error de conexión al eliminar subasta. Inténtalo de nuevo.');
        }
    }
    // --- FIN DE LÓGICA ESPECÍFICA PARA ADMIN PANEL ---

    // --- Lógica de Visualización y Puja de Subastas (para subastas.html) ---

    // Esta función solo se ejecuta si activeAuctionsList existe (es decir, en subastas.html)
    async function fetchAuctions() {
        if (!activeAuctionsList) return; // Asegura que solo se ejecute en subastas.html
        
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

        // Limpiar intervalos de contadores anteriores para evitar duplicados
        for (const id in countdownIntervals) {
            clearInterval(countdownIntervals[id]);
            delete countdownIntervals[id];
        }

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
                <p>Finaliza en: <span class="countdown" data-end-date="${auction.endDate}" data-auction-id="${auction._id}"></span></p>
                <div class="bid-controls">
                    <input type="number" class="bid-input" placeholder="Tu puja" min="${auction.currentBid + 1}" step="1" data-auction-id="${auction._id}">
                    <button class="button bid-button" data-auction-id="${auction._id}">Pujar</button>
                    <p class="bid-message" id="bid-message-${auction._id}" style="display:none;"></p>
                </div>
            `;
            activeAuctionsList.appendChild(auctionCard);
        });

        startCountdowns(); // Iniciar los contadores de tiempo para las subastas
        
        // Re-adjuntar listeners a los botones de puja después de que se han renderizado
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
            const auctionId = countdownElement.dataset.auctionId; // Obtener el ID de la subasta

            // Limpiar cualquier intervalo anterior para este ID específico
            if (countdownIntervals[auctionId]) {
                clearInterval(countdownIntervals[auctionId]);
            }

            const updateCountdown = () => {
                const now = new Date().getTime();
                const distance = endDate - now;

                if (distance < 0) {
                    countdownElement.innerHTML = '¡Finalizada!';
                    const bidButton = countdownElement.closest('.auction-card').querySelector('.bid-button');
                    const bidInput = countdownElement.closest('.auction-card').querySelector('.bid-input');
                    if (bidButton) bidButton.disabled = true;
                    if (bidInput) bidInput.disabled = true;
                    clearInterval(countdownIntervals[auctionId]); // Limpiar el intervalo para esta subasta
                    delete countdownIntervals[auctionId]; // Eliminar de la lista de intervalos
                    fetchAuctions(); // Opcional: Recargar las subastas para que desaparezca la finalizada
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            };

            // Ejecutar una vez inmediatamente y luego establecer el intervalo
            updateCountdown();
            countdownIntervals[auctionId] = setInterval(updateCountdown, 1000);
        });
    }
});