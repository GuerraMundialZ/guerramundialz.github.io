// [DEBUG] admin-script.js: Script cargado y ejecutándose.
document.addEventListener('DOMContentLoaded', () => {
    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com'; // Asegúrate de que esta URL sea correcta

    // Referencias a elementos del DOM (autenticación y navegación)
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userDisplay = document.getElementById('user-display');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
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

    // [CORRECCIÓN DE ÁMBITO] Mover funciones relacionadas con la gestión de subastas fuera del bloque if(admin.html)
    // para que sean accesibles desde updateAuthUI y otros lugares.

    // Función para cargar todas las subastas para el panel de administración
    async function loadAdminAuctions() {
        console.log('[DEBUG] loadAdminAuctions: Cargando subastas para admin...'); // DEBUG
        auctionsLoadingMessage.style.display = 'block';
        auctionsErrorMessage.style.display = 'none';
        adminAuctionsTableBody.innerHTML = ''; // Limpiar la tabla

        const token = getAuthToken();
        if (!token) {
            console.log('[DEBUG] loadAdminAuctions: No hay token, no se pueden cargar subastas.'); // DEBUG
            auctionsLoadingMessage.style.display = 'none';
            auctionsErrorMessage.style.display = 'block';
            auctionsErrorMessage.textContent = 'No autenticado. Por favor, inicia sesión como administrador.';
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/auctions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 403) { // Acceso denegado (no admin)
                console.warn('[DEBUG] loadAdminAuctions: Acceso denegado (403).'); // DEBUG
                showMessage(auctionsErrorMessage, 'No tienes permisos para ver esta sección. Redirigiendo...', 'error');
                setTimeout(() => { window.location.href = 'index.html'; }, 2000);
                return;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const auctions = await response.json();
            console.log('[DEBUG] loadAdminAuctions: Subastas cargadas:', auctions); // DEBUG
            auctionsLoadingMessage.style.display = 'none';

            if (auctions.length === 0) {
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

                let statusText = auction.status;
                let statusClass = '';

                // Lógica para el estado de la subasta
                if (auction.status === 'active' && endDate <= new Date()) {
                    statusText = 'Finalizada (Pendiente de Cron)';
                    statusClass = 'info-message';
                } else if (auction.status === 'finalized') {
                    statusText = 'Finalizada';
                    statusClass = 'success-message';
                } else if (auction.status === 'cancelled') {
                    statusText = 'Cancelada';
                    statusClass = 'error-message';
                } else if (auction.status === 'active') {
                    statusText = 'Activa';
                    statusClass = 'info-message';
                }

                row.innerHTML = `
                    <td>${auction.title}</td>
                    <td>${auction.currentBid.toFixed(2)} Rublos ${auction.currentBidderName ? `(${auction.currentBidderName})` : ''}</td>
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

        } catch (error) {
            console.error('[DEBUG] Error loading admin auctions:', error);
            auctionsLoadingMessage.style.display = 'none';
            showMessage(auctionsErrorMessage, 'Error al cargar las subastas: ' + error.message, 'error');
        }
    }

    // Abrir modal de edición y cargar datos
    async function openEditModal(auctionId) {
        console.log('[DEBUG] openEditModal: Abriendo modal de edición para ID:', auctionId); // DEBUG
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const auction = await response.json();
            console.log('[DEBUG] openEditModal: Datos de subasta para edición:', auction); // DEBUG

            editAuctionIdInput.value = auction._id;
            editTitleInput.value = auction.title;
            editDescriptionInput.value = auction.description;
            editImageUrlInput.value = auction.imageUrl && auction.imageUrl !== 'https://via.placeholder.com/300x200?text=No+Image' ? auction.imageUrl : '';
            editStartBidInput.value = auction.startBid;
            const date = new Date(auction.endDate);
            const formattedDate = date.toISOString().slice(0, 16);
            editEndDateInput.value = formattedDate;
            editStatusSelect.value = auction.status;

            editAuctionMessage.style.display = 'none';
            editAuctionModal.style.display = 'flex';
        } catch (error) {
            console.error('[DEBUG] Error fetching auction for edit:', error);
            showMessage(editAuctionMessage, 'Error al cargar los datos de la subasta para edición.', 'error');
        }
    }

    // Abrir modal de confirmación de eliminación
    function openConfirmDeleteModal(id, title) {
        console.log('[DEBUG] openConfirmDeleteModal: Abriendo modal de eliminación para ID:', id); // DEBUG
        auctionToDeleteId = id;
        auctionToDeleteTitleSpan.textContent = title;
        deleteAuctionMessage.style.display = 'none';
        confirmDeleteModal.style.display = 'flex';
    }

    // Manejar finalización manual de subasta
    async function finalizeAuction(auctionId) {
        console.log('[DEBUG] finalizeAuction: Finalizando subasta manualmente para ID:', auctionId); // DEBUG
        if (!confirm('¿Estás seguro de que quieres finalizar esta subasta manualmente?')) {
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
            console.log('[DEBUG] finalizeAuction: Respuesta del backend:', response.status, result); // DEBUG

            if (response.ok) {
                showMessage(auctionsErrorMessage, 'Subasta finalizada manualmente con éxito!', 'success');
                loadAdminAuctions();
            } else {
                showMessage(auctionsErrorMessage, result.message || 'Error al finalizar la subasta manualmente.', 'error');
            }
        } catch (error) {
            console.error('[DEBUG] Error finalizing auction manually:', error); // DEBUG
            showMessage(auctionsErrorMessage, 'Error de conexión al finalizar la subasta.', 'error');
        }
    }


    // Función para actualizar la UI de autenticación
    async function updateAuthUI() {
        console.log('[DEBUG] updateAuthUI: Iniciando...'); // DEBUG
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

                userAvatar.src = avatar;
                userName.textContent = username;
                userDisplay.style.display = 'flex';
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';

                if (adminPanelBtnNav) {
                    if (isAdminUser) {
                        adminPanelBtnNav.style.display = 'block';
                    } else {
                        adminPanelBtnNav.style.display = 'none';
                    }
                }

                // Si estamos en admin.html y el usuario NO es admin, redirigir
                if (window.location.pathname.includes('admin.html') && !isAdminUser) {
                    console.log('[DEBUG] updateAuthUI: Usuario no es admin, redirigiendo a index.html'); // DEBUG
                    window.location.href = 'index.html';
                } else if (window.location.pathname.includes('admin.html') && isAdminUser) {
                    console.log('[DEBUG] updateAuthUI: Usuario es admin en admin.html, cargando subastas.'); // DEBUG
                    loadAdminAuctions(); // Llamada a la función ahora accesible
                }

            } else {
                console.log('[DEBUG] updateAuthUI: Token inválido o incompleto, cerrando sesión.'); // DEBUG
                logoutUser();
            }
        } else {
            console.log('[DEBUG] updateAuthUI: No hay token, mostrando botones de login.'); // DEBUG
            userDisplay.style.display = 'none';
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
            if (adminPanelBtnNav) adminPanelBtnNav.style.display = 'none';

            // Redirigir si no hay token y estamos en admin.html
            if (window.location.pathname.includes('admin.html')) {
                console.log('[DEBUG] No hay token en admin.html, redirigiendo a index.html'); // DEBUG
                window.location.href = 'index.html';
            }
        }
    }

    // Función para iniciar sesión (redirección a Discord OAuth)
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('[DEBUG] Login button clicked, redirigiendo a Discord OAuth.'); // DEBUG
            window.location.href = `${BACKEND_URL}/auth/discord`;
        });
    }

    // Función para cerrar sesión
    function logoutUser() {
        console.log('[DEBUG] Cerrando sesión del usuario.'); // DEBUG
        setAuthToken(null);
        updateAuthUI();
        if (window.location.pathname.includes('admin.html') || window.location.pathname.includes('subastas.html')) {
            window.location.href = 'index.html';
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }

    // Añadir listener para el botón "Panel Admin"
    if (adminPanelBtnNav) {
        adminPanelBtnNav.addEventListener('click', () => {
            console.log('[DEBUG] Admin Panel button clicked.'); // DEBUG
            window.location.href = 'admin.html'; // Redirige a la página de administración
        });
    }

    // Manejar el callback de Discord OAuth
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
        console.log('[DEBUG] Token encontrado en la URL, estableciendo token y actualizando UI.'); // DEBUG
        setAuthToken(token);
        window.history.replaceState({}, document.title, window.location.pathname);
        updateAuthUI();
    } else {
        console.log('[DEBUG] No token found in URL, updating UI based on localStorage.'); // DEBUG
        updateAuthUI(); // Llama a updateAuthUI al final para configurar la UI inicial
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
    // Esta parte solo se ejecuta si la página actual es admin.html
    if (window.location.pathname.includes('admin.html')) {
        console.log('[DEBUG] admin.html: Script ejecutándose en la página de administración.'); // DEBUG

        // --- Lógica de Creación de Subasta ---
        console.log('[DEBUG] admin.html: Verificando createAuctionForm...');
        if (createAuctionForm) {
            console.log('[DEBUG] admin.html: createAuctionForm encontrado. Añadiendo event listener.');
            createAuctionForm.addEventListener('submit', async (e) => {
                console.log('[DEBUG] createAuctionForm: Evento submit disparado.');
                e.preventDefault();

                const title = document.getElementById('auction-title').value;
                const description = document.getElementById('auction-description').value;
                const imageUrl = document.getElementById('auction-image-url').value.trim();
                const startBid = parseFloat(document.getElementById('auction-start-bid').value);
                const endDate = document.getElementById('auction-end-date').value;

                console.log('[DEBUG] createAuctionForm: Datos del formulario:', { title, description, imageUrl, startBid, endDate });

                // Validaciones básicas antes de enviar
                if (!title || !description || isNaN(startBid) || startBid < 0 || !endDate) {
                    showMessage(createAuctionMessage, 'Por favor, completa todos los campos obligatorios y asegúrate de que la puja inicial sea un número válido.', 'error');
                    console.log('[DEBUG] createAuctionForm: Fallo en validación de campos.');
                    return;
                }

                const token = getAuthToken();
                if (!token) {
                    showMessage(createAuctionMessage, 'Debes iniciar sesión para crear una subasta.', 'error');
                    console.log('[DEBUG] createAuctionForm: No hay token de autenticación.');
                    return;
                }
                console.log('[DEBUG] createAuctionForm: Token de autenticación presente.');

                try {
                    console.log('[DEBUG] createAuctionForm: Intentando enviar fetch POST a /api/auctions...');
                    const response = await fetch(`${BACKEND_URL}/api/auctions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            title,
                            description,
                            imageUrl: imageUrl || null,
                            startBid,
                            endDate
                        })
                    });

                    const result = await response.json();
                    console.log('[DEBUG] createAuctionForm: Respuesta del backend:', response.status, result);

                    if (response.ok) {
                        showMessage(createAuctionMessage, 'Subasta creada con éxito!', 'success');
                        createAuctionForm.reset();
                        loadAdminAuctions();
                    } else {
                        showMessage(createAuctionMessage, result.message || 'Error al crear la subasta.', 'error');
                    }
                } catch (error) {
                    console.error('[DEBUG] Error creating auction:', error);
                    showMessage(createAuctionMessage, 'Error de conexión al crear la subasta. Inténtalo de nuevo.', 'error');
                }
            });
        } else {
            console.error('[DEBUG] admin.html: createAuctionForm NO ENCONTRADO. El formulario de creación no se inicializará.');
        }

        // Cerrar modal de edición
        if (editAuctionCloseBtn) {
            editAuctionCloseBtn.addEventListener('click', () => {
                console.log('[DEBUG] Edit modal close button clicked.');
                editAuctionModal.style.display = 'none';
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target === editAuctionModal) {
                console.log('[DEBUG] Clicked outside edit modal.');
                editAuctionModal.style.display = 'none';
            }
        });

        // Enviar formulario de edición
        if (editAuctionForm) {
            editAuctionForm.addEventListener('submit', async (e) => {
                console.log('[DEBUG] editAuctionForm: Evento submit disparado.');
                e.preventDefault();

                const auctionId = editAuctionIdInput.value;
                const updatedData = {
                    title: editTitleInput.value,
                    description: editDescriptionInput.value,
                    imageUrl: editImageUrlInput.value.trim() || null,
                    startBid: parseFloat(editStartBidInput.value),
                    endDate: editEndDateInput.value,
                    status: editStatusSelect.value
                };
                console.log('[DEBUG] editAuctionForm: Datos a actualizar:', updatedData);

                const token = getAuthToken();
                if (!token) {
                    showMessage(editAuctionMessage, 'No autenticado para actualizar.', 'error');
                    return;
                }

                try {
                    console.log(`[DEBUG] editAuctionForm: Intentando enviar fetch PUT a /api/auctions/${auctionId}...`);
                    const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(updatedData)
                    });

                    const result = await response.json();
                    console.log('[DEBUG] editAuctionForm: Respuesta del backend:', response.status, result);

                    if (response.ok) {
                        showMessage(editAuctionMessage, 'Subasta actualizada con éxito!', 'success');
                        editAuctionModal.style.display = 'none';
                        loadAdminAuctions();
                    } else {
                        showMessage(editAuctionMessage, result.message || 'Error al actualizar la subasta.', 'error');
                    }
                } catch (error) {
                    console.error('[DEBUG] Error updating auction:', error);
                    showMessage(editAuctionMessage, 'Error de conexión al actualizar la subasta.', 'error');
                }
            });
        }

        // Cerrar modal de confirmación de eliminación
        if (confirmDeleteCloseBtn) {
            confirmDeleteCloseBtn.addEventListener('click', () => {
                console.log('[DEBUG] Delete confirm modal close button clicked.');
                confirmDeleteModal.style.display = 'none';
                auctionToDeleteId = null;
            });
        }
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                console.log('[DEBUG] Delete confirm modal cancel button clicked.');
                confirmDeleteModal.style.display = 'none';
                auctionToDeleteId = null;
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target === confirmDeleteModal) {
                console.log('[DEBUG] Clicked outside delete confirm modal.');
                confirmDeleteModal.style.display = 'none';
                auctionToDeleteId = null;
            }
        });

        // Confirmar y eliminar subasta
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                console.log('[DEBUG] confirmDeleteBtn: Eliminar confirmado para ID:', auctionToDeleteId);
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
                    console.log('[DEBUG] deleteAuction: Respuesta del backend:', response.status, result);

                    if (response.ok) {
                        showMessage(deleteAuctionMessage, 'Subasta eliminada con éxito!', 'success');
                        confirmDeleteModal.style.display = 'none';
                        loadAdminAuctions();
                    } else {
                        showMessage(deleteAuctionMessage, result.message || 'Error al eliminar la subasta.', 'error');
                    }
                } catch (error) {
                    console.error('[DEBUG] Error deleting auction:', error);
                    showMessage(deleteAuctionMessage, 'Error de conexión al eliminar la subasta.', 'error');
                } finally {
                    auctionToDeleteId = null;
                }
            });
        }
    }
    // Llama a updateAuthUI al final para configurar la UI inicial
    updateAuthUI();
});
