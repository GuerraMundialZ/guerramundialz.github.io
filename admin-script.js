document.addEventListener('DOMContentLoaded', () => {
    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com'; // Asegúrate de que esta URL sea correcta

    // Referencias a elementos del DOM (autenticación y navegación)
    const loginButton = document.getElementById('login-button');
    const userDropdownWrapper = document.getElementById('user-dropdown-wrapper'); // Contenedor del dropdown
    const userDisplay = document.getElementById('user-display');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userDropdownContent = document.getElementById('user-dropdown-content'); // Contenido del dropdown
    const logoutButton = document.getElementById('logout-button');
    const adminPanelBtnNav = document.getElementById('admin-panel-btn-nav');

    // Referencias para la sección de Crear Subasta
    const createAuctionForm = document.getElementById('create-auction-form');
    const createAuctionMessage = document.getElementById('create-auction-message');

    // Referencias para la sección de Gestionar Subastas
    const adminAuctionsTableBody = document.querySelector('#admin-auctions-table tbody');
    const auctionsLoadingMessage = document.getElementById('auctions-loading-message');
    const auctionsErrorMessage = document.getElementById('auctions-error-message');

    // Referencias para la modal de Edición
    const editAuctionModal = document.getElementById('edit-auction-modal');
    const editAuctionCloseBtn = editAuctionModal ? editAuctionModal.querySelector('.close-button') : null;
    const editAuctionForm = document.getElementById('edit-auction-form');
    const editAuctionIdInput = document.getElementById('edit-auction-id');
    const editTitleInput = document.getElementById('edit-title');
    const editDescriptionInput = document.getElementById('edit-description');
    const editImageUrlInput = document.getElementById('edit-image-url');
    const editStartBidInput = document.getElementById('edit-start-bid');
    const editEndDateInput = document.getElementById('edit-end-date');
    const editStatusSelect = document.getElementById('edit-status');
    const editAuctionMessage = document.getElementById('edit-auction-message');

    // Referencias para la modal de Confirmación de Eliminación
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const confirmDeleteCloseBtn = confirmDeleteModal ? confirmDeleteModal.querySelector('.close-button') : null;
    const auctionToDeleteTitleSpan = document.getElementById('auction-to-delete-title');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteAuctionMessage = document.getElementById('delete-auction-message');

    let auctionToDeleteId = null; // Variable para almacenar el ID de la subasta a eliminar

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

    // Función para mostrar mensajes en un elemento <p>
    function showMessage(element, message, type = 'info') {
        element.textContent = message;
        element.className = `message ${type}-message`; // Asigna clases CSS para estilo
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000); // Ocultar después de 5 segundos
    }

    // Función para formatear cantidades de dinero con separador de miles (punto) y decimales (solo si son necesarios)
    function formatCurrency(amount) {
        const formatter = new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            useGrouping: true
        });
        return formatter.format(amount);
    }

    // Función para actualizar la UI de autenticación
    async function updateAuthUI() {
        console.log('[DEBUG] updateAuthUI: Iniciado.');
        const token = getAuthToken();
        if (token) {
            const decodedToken = parseJwt(token);
            if (decodedToken && decodedToken.id) {
                const currentTime = Date.now() / 1000;
                if (decodedToken.exp < currentTime) {
                    console.log("[DEBUG] Token expirado. Cerrando sesión automáticamente.");
                    logoutUser();
                    return;
                }

                const userId = decodedToken.id;
                const username = decodedToken.username || 'Usuario';
                const avatar = decodedToken.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${decodedToken.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
                const isAdminUser = decodedToken.isAdmin;
                console.log(`[DEBUG] Usuario autenticado: ${username}, isAdmin: ${isAdminUser}`);

                userAvatar.src = avatar;
                userName.textContent = username;
                userDropdownWrapper.style.display = 'flex'; // Mostrar el contenedor del dropdown
                loginButton.style.display = 'none';

                if (adminPanelBtnNav) {
                    if (isAdminUser) {
                        adminPanelBtnNav.style.display = 'block'; // Mostrar como bloque dentro del flex
                    } else {
                        adminPanelBtnNav.style.display = 'none';
                    }
                }
                logoutButton.style.display = 'block'; // El botón de cerrar sesión siempre visible en el dropdown

                // Si estamos en admin.html y el usuario NO es admin, redirigir
                if (window.location.pathname.includes('admin.html') && !isAdminUser) {
                    console.log("[DEBUG] No es admin en admin.html, redirigiendo a index.html");
                    window.location.href = 'index.html';
                } else if (window.location.pathname.includes('admin.html') && isAdminUser) {
                    // Si es admin y estamos en admin.html, cargar las subastas
                    console.log("[DEBUG] Es admin en admin.html, cargando subastas.");
                    loadAdminAuctions();
                }

            } else {
                console.log("[DEBUG] Token inválido o incompleto. Cerrando sesión.");
                logoutUser();
            }
        } else {
            console.log("[DEBUG] No hay token. Mostrando botón de login.");
            loginButton.style.display = 'flex'; // Mostrar el botón de login
            userDropdownWrapper.style.display = 'none'; // Ocultar el contenedor del dropdown
            userDropdownContent.classList.remove('show'); // Asegurarse de que el dropdown esté cerrado

            // Redirigir si no hay token y estamos en admin.html
            if (window.location.pathname.includes('admin.html')) {
                console.log("[DEBUG] No hay token en admin.html, redirigiendo a index.html");
                window.location.href = 'index.html';
            }
        }
    }

    // Función para iniciar sesión (redirección a Discord OAuth)
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('[DEBUG] Click en Iniciar Sesión. Redirigiendo a Discord OAuth.');
            window.location.href = `${BACKEND_URL}/auth/discord`;
        });
    }

    // Función para cerrar sesión
    function logoutUser() {
        console.log('[DEBUG] Cerrando sesión.');
        setAuthToken(null);
        updateAuthUI();
        if (window.location.pathname.includes('admin.html') || window.location.pathname.includes('subastas.html')) {
            window.location.href = 'index.html';
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }

    // Lógica para el dropdown del usuario
    if (userDisplay) {
        userDisplay.addEventListener('click', (event) => {
            event.stopPropagation(); // Evitar que el clic se propague al documento
            userDropdownContent.classList.toggle('show');
            userDropdownWrapper.classList.toggle('active'); // Para rotar la flecha
            console.log('[DEBUG] Click en userDisplay. Dropdown toggled.');
        });

        // Cerrar el dropdown si se hace clic fuera de él
        window.addEventListener('click', (event) => {
            if (userDropdownContent.classList.contains('show') && !userDropdownWrapper.contains(event.target)) {
                userDropdownContent.classList.remove('show');
                userDropdownWrapper.classList.remove('active');
                console.log('[DEBUG] Click fuera del dropdown. Dropdown cerrado.');
            }
        });
    }

    // Añadir listener para el botón "Panel Admin"
    if (adminPanelBtnNav) {
        adminPanelBtnNav.addEventListener('click', () => {
            console.log('[DEBUG] Click en Panel Admin. Redirigiendo a admin.html.');
            window.location.href = 'admin.html'; // Redirige a la página de administración
        });
    }

    // Manejar el callback de Discord OAuth
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
        console.log('[DEBUG] Token encontrado en la URL. Guardando y actualizando UI.');
        setAuthToken(token);
        window.history.replaceState({}, document.title, window.location.pathname);
        updateAuthUI();
    } else {
        console.log('[DEBUG] No token en la URL. Actualizando UI.');
        updateAuthUI();
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

    // --- Lógica específica para admin.html ---
    if (window.location.pathname.includes('admin.html')) {
        console.log('[DEBUG] Página actual es admin.html. Inicializando lógica de administración.');

        // Función para cargar todas las subastas para el panel de administración
        async function loadAdminAuctions() {
            console.log('[DEBUG] loadAdminAuctions: Iniciado.');
            auctionsLoadingMessage.style.display = 'block';
            auctionsErrorMessage.style.display = 'none';
            adminAuctionsTableBody.innerHTML = ''; // Limpiar la tabla

            const token = getAuthToken();
            if (!token) {
                console.log('[DEBUG] loadAdminAuctions: No hay token de autenticación.');
                auctionsLoadingMessage.style.display = 'none';
                auctionsErrorMessage.style.display = 'block';
                auctionsErrorMessage.textContent = 'No autenticado. Por favor, inicia sesión como administrador.';
                return;
            }

            try {
                console.log('[DEBUG] loadAdminAuctions: Realizando fetch a /api/auctions...');
                const response = await fetch(`${BACKEND_URL}/api/auctions`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('[DEBUG] loadAdminAuctions: Respuesta del backend - Status:', response.status);

                if (response.status === 403) { // Acceso denegado (no admin)
                    console.error('[DEBUG] Acceso denegado (403).');
                    auctionsLoadingMessage.style.display = 'none';
                    auctionsErrorMessage.style.display = 'block';
                    auctionsErrorMessage.textContent = 'Acceso denegado. No tienes permisos de administrador para ver las subastas.';
                    // Opcional: Redirigir a index.html si no es admin
                    setTimeout(() => { window.location.href = 'index.html'; }, 3000);
                    return;
                }
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('[DEBUG] Error HTTP al cargar subastas:', response.status, errorData);
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
                }

                const auctions = await response.json();
                console.log('[DEBUG] Subastas recibidas:', auctions);
                auctionsLoadingMessage.style.display = 'none';

                if (auctions.length === 0) {
                    console.log('[DEBUG] No hay subastas para mostrar.');
                    adminAuctionsTableBody.innerHTML = '<tr><td colspan="5">No hay subastas para mostrar.</td></tr>';
                    return;
                }

                auctions.forEach(auction => {
                    const row = adminAuctionsTableBody.insertRow();
                    const endDate = new Date(auction.endDate);
                    const formattedEndDate = endDate.toLocaleString('es-ES', {
                        year: 'numeric', month: 'numeric', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });

                    let statusText;
                    let statusClass;
                    const now = new Date();

                    if (auction.status === 'finalized') {
                        statusText = 'Finalizada';
                        statusClass = 'success-message';
                    } else if (auction.status === 'cancelled') {
                        statusText = 'Cancelada';
                        statusClass = 'error-message';
                    } else if (auction.status === 'active' && endDate <= now) {
                        statusText = 'Finalizada (Pendiente de Cron)';
                        statusClass = 'info-message';
                    } else if (auction.status === 'active') {
                        statusText = 'Activa';
                        statusClass = 'info-message';
                    } else {
                        statusText = 'Desconocido';
                        statusClass = 'info-message'; 
                    }

                    row.innerHTML = `
                        <td>${auction.title}</td>
                        <td>${formatCurrency(auction.currentBid)} Rublos ${auction.currentBidderName ? `(${auction.currentBidderName})` : ''}</td>
                        <td>${formattedEndDate}</td>
                        <td><span class="message ${statusClass}">${statusText}</span></td>
                        <td>
                            <button class="button button-small button-edit edit-auction-btn" data-id="${auction._id}">Editar</button>
                            <button class="button button-small button-danger delete-auction-btn" data-id="${auction._id}" data-title="${auction.title}">Eliminar</button>
                            ${auction.status === 'active' ? `<button class="button button-small button-finalize finalize-auction-btn" data-id="${auction._id}">Finalizar</button>` : ''}
                        </td>
                    `;
                });

                // Añadir event listeners a los botones de la tabla
                adminAuctionsTableBody.querySelectorAll('.edit-auction-btn').forEach(button => {
                    button.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
                });
                adminAuctionsTableBody.querySelectorAll('.delete-auction-btn').forEach(button => {
                    button.addEventListener('click', (e) => openConfirmDeleteModal(e.target.dataset.id, e.target.dataset.title));
                });
                adminAuctionsTableBody.querySelectorAll('.finalize-auction-btn').forEach(button => {
                    button.addEventListener('click', (e) => finalizeAuction(e.target.dataset.id));
                });
                console.log('[DEBUG] Subastas cargadas y tabla actualizada.');

            } catch (error) {
                console.error('[DEBUG] Error al cargar las subastas de administración:', error);
                auctionsLoadingMessage.style.display = 'none';
                showMessage(auctionsErrorMessage, 'Error al cargar las subastas: ' + error.message, 'error');
            }
        }

        // --- Lógica de Creación de Subasta ---
        if (createAuctionForm) {
            createAuctionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('[DEBUG] Formulario de creación de subasta enviado.');

                const title = document.getElementById('auction-title').value;
                const description = document.getElementById('auction-description').value;
                const imageUrl = document.getElementById('auction-image-url').value;
                const startBid = parseFloat(document.getElementById('auction-start-bid').value);
                const endDate = document.getElementById('auction-end-date').value;

                const token = getAuthToken();
                if (!token) {
                    showMessage(createAuctionMessage, 'Debes iniciar sesión para crear una subasta.', 'error');
                    return;
                }

                try {
                    const response = await fetch(`${BACKEND_URL}/api/auctions`, { // POST a /api/auctions
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ title, description, imageUrl, startBid, endDate })
                    });

                    const result = await response.json();
                    console.log('[DEBUG] Respuesta de creación de subasta:', response.status, result);

                    if (response.ok) {
                        showMessage(createAuctionMessage, 'Subasta creada con éxito!', 'success');
                        createAuctionForm.reset(); // Limpiar formulario
                        loadAdminAuctions(); // Recargar la tabla de subastas
                    } else {
                        showMessage(createAuctionMessage, result.message || 'Error al crear la subasta.', 'error');
                    }
                } catch (error) {
                    console.error('[DEBUG] Error creando subasta:', error);
                    showMessage(createAuctionMessage, 'Error de conexión al crear la subasta.', 'error');
                }
            });
        }

        // --- Lógica de Edición de Subasta ---
        // Abrir modal de edición
        async function openEditModal(auctionId) {
            console.log(`[DEBUG] Abriendo modal de edición para subasta ID: ${auctionId}`);
            editAuctionMessage.style.display = 'none'; // Ocultar mensajes anteriores
            const token = getAuthToken();
            if (!token) {
                showMessage(editAuctionMessage, 'No autenticado para editar.', 'error');
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
                }
                const auction = await response.json();
                console.log('[DEBUG] Datos de subasta para edición:', auction);

                editAuctionIdInput.value = auction._id;
                editTitleInput.value = auction.title;
                editDescriptionInput.value = auction.description;
                editImageUrlInput.value = auction.imageUrl && auction.imageUrl !== 'https://via.placeholder.com/300x200?text=No+Image' ? auction.imageUrl : '';
                editStartBidInput.value = auction.startBid;
                const date = new Date(auction.endDate);
                const formattedDate = date.toISOString().slice(0, 16);
                editEndDateInput.value = formattedDate;
                editStatusSelect.value = auction.status;

                editAuctionModal.style.display = 'flex';
            } catch (error) {
                console.error('[DEBUG] Error al cargar los datos de la subasta para edición:', error);
                showMessage(editAuctionMessage, 'Error al cargar los datos de la subasta para edición: ' + error.message, 'error');
            }
        }

        // Cerrar modal de edición
        if (editAuctionCloseBtn) {
            editAuctionCloseBtn.addEventListener('click', () => {
                editAuctionModal.style.display = 'none';
                console.log('[DEBUG] Modal de edición cerrada.');
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target === editAuctionModal) {
                editAuctionModal.style.display = 'none';
                console.log('[DEBUG] Modal de edición cerrada por clic fuera.');
            }
        });

        // Enviar formulario de edición
        if (editAuctionForm) {
            editAuctionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('[DEBUG] Formulario de edición de subasta enviado.');

                const auctionId = editAuctionIdInput.value;
                const updatedData = {
                    title: editTitleInput.value,
                    description: editDescriptionInput.value,
                    imageUrl: editImageUrlInput.value,
                    startBid: parseFloat(editStartBidInput.value),
                    endDate: editEndDateInput.value,
                    status: editStatusSelect.value
                };

                const token = getAuthToken();
                if (!token) {
                    showMessage(editAuctionMessage, 'No autenticado para actualizar.', 'error');
                    return;
                }

                try {
                    const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(updatedData)
                    });

                    const result = await response.json();
                    console.log('[DEBUG] Respuesta de actualización de subasta:', response.status, result);

                    if (response.ok) {
                        showMessage(editAuctionMessage, 'Subasta actualizada con éxito!', 'success');
                        editAuctionModal.style.display = 'none';
                        loadAdminAuctions(); // Recargar la tabla
                    } else {
                        showMessage(editAuctionMessage, result.message || 'Error al actualizar la subasta.', 'error');
                    }
                } catch (error) {
                    console.error('[DEBUG] Error actualizando subasta:', error);
                    showMessage(editAuctionMessage, 'Error de conexión al actualizar la subasta.', 'error');
                }
            });
        }

        // --- Lógica de Eliminación de Subasta ---
        // Abrir modal de confirmación de eliminación
        function openConfirmDeleteModal(id, title) {
            console.log(`[DEBUG] Abriendo modal de confirmación para eliminar subasta ID: ${id}, Título: "${title}"`);
            auctionToDeleteId = id;
            auctionToDeleteTitleSpan.textContent = title;
            deleteAuctionMessage.style.display = 'none'; // Ocultar mensajes anteriores
            confirmDeleteModal.style.display = 'flex';
        }

        // Cerrar modal de confirmación de eliminación
        if (confirmDeleteCloseBtn) {
            confirmDeleteCloseBtn.addEventListener('click', () => {
                confirmDeleteModal.style.display = 'none';
                auctionToDeleteId = null;
                console.log('[DEBUG] Modal de eliminación cerrada.');
            });
        }
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                confirmDeleteModal.style.display = 'none';
                auctionToDeleteId = null;
                console.log('[DEBUG] Modal de eliminación cancelada.');
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target === confirmDeleteModal) {
                confirmDeleteModal.style.display = 'none';
                auctionToDeleteId = null;
                console.log('[DEBUG] Modal de eliminación cerrada por clic fuera.');
            }
        });

        // Confirmar y eliminar subasta
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                console.log('[DEBUG] Confirmada eliminación de subasta.');
                if (!auctionToDeleteId) return;

                const token = getAuthToken();
                if (!token) {
                    showMessage(deleteAuctionMessage, 'No autenticado para eliminar.', 'error');
                    return;
                }

                try {
                    const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionToDeleteId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    const result = await response.json();
                    console.log('[DEBUG] Respuesta de eliminación de subasta:', response.status, result);

                    if (response.ok) {
                        showMessage(deleteAuctionMessage, 'Subasta eliminada con éxito!', 'success');
                        confirmDeleteModal.style.display = 'none';
                        loadAdminAuctions(); // Recargar la tabla
                    } else {
                        showMessage(deleteAuctionMessage, result.message || 'Error al eliminar la subasta.', 'error');
                    }
                } catch (error) {
                    console.error('[DEBUG] Error eliminando subasta:', error);
                    showMessage(deleteAuctionMessage, 'Error de conexión al eliminar la subasta.', 'error');
                } finally {
                    auctionToDeleteId = null;
                }
            });
        }

        // --- Lógica de Finalización Manual de Subasta ---
        async function finalizeAuction(auctionId) {
            console.log(`[DEBUG] Intentando finalizar subasta ID: ${auctionId} manualmente.`);
            if (!confirm('¿Estás seguro de que quieres finalizar esta subasta manualmente?')) {
                console.log('[DEBUG] Finalización manual cancelada por el usuario.');
                return;
            }

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
                console.log('[DEBUG] Respuesta de finalización manual:', response.status, result);

                if (response.ok) {
                    showMessage(auctionsErrorMessage, 'Subasta finalizada manualmente con éxito!', 'success');
                    loadAdminAuctions(); // Recargar la tabla para ver el estado actualizado
                } else {
                    showMessage(auctionsErrorMessage, result.message || 'Error al finalizar la subasta manualmente.', 'error');
                }
            } catch (error) {
                console.error('[DEBUG] Error finalizando subasta manualmente:', error);
                showMessage(auctionsErrorMessage, 'Error de conexión al finalizar la subasta.', 'error');
            }
        }
    }
});
