document.addEventListener('DOMContentLoaded', () => {
    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com'; // Asegúrate de que esta URL sea correcta

    // Referencias a elementos del DOM (autenticación)
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userDisplay = document.getElementById('user-display');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const createAuctionBtnNav = document.getElementById('create-auction-btn-nav');
    const adminPanelBtnNav = document.getElementById('admin-panel-btn-nav');

    // Referencias para la sección de administración de subastas
    const createAuctionForm = document.getElementById('create-auction-form');
    const createAuctionMessage = document.getElementById('create-auction-message');
    const adminAuctionsTableBody = document.querySelector('#admin-auctions-table tbody');
    const auctionsLoadingMessage = document.getElementById('auctions-loading-message');
    const auctionsErrorMessage = document.getElementById('auctions-error-message');

    // Referencias para la modal de edición
    const editAuctionModal = document.getElementById('edit-auction-modal');
    const editAuctionForm = document.getElementById('edit-auction-form');
    const editAuctionId = document.getElementById('edit-auction-id');
    const editTitle = document.getElementById('edit-title');
    const editDescription = document.getElementById('edit-description');
    const editImageUrl = document.getElementById('edit-image-url');
    const editStartBid = document.getElementById('edit-start-bid');
    const editEndDate = document.getElementById('edit-end-date');
    const editStatus = document.getElementById('edit-status');
    const editAuctionMessage = document.getElementById('edit-auction-message');

    // Referencias para la modal de confirmación de eliminación
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const auctionToDeleteTitle = document.getElementById('auction-to-delete-title');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteAuctionMessage = document.getElementById('delete-auction-message');

    let currentAuctionIdToDelete = null; // Variable para almacenar el ID de la subasta a eliminar

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

                // Obtener información del usuario (incluyendo roles) desde el backend si es necesario
                // O confiar en la información del token si incluye roles
                const userId = decodedToken.id;
                const username = decodedToken.username || 'Usuario';
                const avatar = decodedToken.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${decodedToken.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
                const isAdminUser = decodedToken.isAdmin; // Asumiendo que el token contiene isAdmin

                userAvatar.src = avatar;
                userName.textContent = username;
                userDisplay.style.display = 'flex';
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';

                // Mostrar botón de crear subasta y panel de admin si es admin
                if (isAdminUser) {
                    if (createAuctionBtnNav) createAuctionBtnNav.style.display = 'block';
                    if (adminPanelBtnNav) adminPanelBtnNav.style.display = 'block';
                } else {
                    if (createAuctionBtnNav) createAuctionBtnNav.style.display = 'none';
                    if (adminPanelBtnNav) adminPanelBtnNav.style.display = 'none';
                }

                // Redirigir si no es admin y está en la página de admin
                if (window.location.pathname.includes('admin.html') && !isAdminUser) {
                    window.location.href = 'index.html'; // Redirige a la página principal
                    return; // Detiene la ejecución para evitar cargar contenido de admin
                }

                // Si estamos en la página de admin y es admin, cargar las subastas
                if (window.location.pathname.includes('admin.html') && isAdminUser) {
                    loadAdminAuctions();
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
                window.location.href = 'index.html'; // Redirige a la página principal
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
        // Redirigir a la página principal si se cierra sesión desde admin.html
        if (window.location.pathname.includes('admin.html')) {
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

    // --- Lógica específica para la página de administración (admin.html) ---
    if (window.location.pathname.includes('admin.html')) {

        // Función para mostrar mensajes
        function showMessage(element, message, type = 'info') {
            element.textContent = message;
            element.className = `message ${type}-message`; // Añade clases para estilos
            element.style.display = 'block';
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000); // Ocultar después de 5 segundos
        }

        // Función para cargar las subastas en la tabla de administración
        async function loadAdminAuctions() {
            auctionsLoadingMessage.style.display = 'block';
            auctionsErrorMessage.style.display = 'none';
            adminAuctionsTableBody.innerHTML = ''; // Limpiar tabla

            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions`, {
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                });

                if (!response.ok) {
                    if (response.status === 403) {
                        showMessage(auctionsErrorMessage, 'No tienes permisos para ver esta sección. Redirigiendo...', 'error');
                        setTimeout(() => window.location.href = 'index.html', 2000);
                        return;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const auctions = await response.json();
                auctionsLoadingMessage.style.display = 'none';

                if (auctions.length === 0) {
                    adminAuctionsTableBody.innerHTML = '<tr><td colspan="5">No hay subastas para gestionar.</td></tr>';
                    return;
                }

                auctions.forEach(auction => {
                    const row = adminAuctionsTableBody.insertRow();
                    const endDate = new Date(auction.endTime);
                    const formattedEndDate = endDate.toLocaleString('es-ES', {
                        year: 'numeric', month: 'numeric', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });

                    row.innerHTML = `
                        <td>${auction.title}</td>
                        <td>${auction.currentPrice.toFixed(2)} Rublos</td>
                        <td>${formattedEndDate}</td>
                        <td>${auction.status === 'active' ? 'Activa' : (auction.status === 'finalized' ? 'Finalizada' : 'Cancelada')}</td>
                        <td>
                            <button class="button button-small button-edit" data-id="${auction._id}">Editar</button>
                            <button class="button button-small button-danger" data-id="${auction._id}">Eliminar</button>
                            ${auction.status === 'active' ? `<button class="button button-small button-finalize" data-id="${auction._id}">Finalizar</button>` : ''}
                        </td>
                    `;
                });

                // Añadir event listeners a los botones de la tabla
                adminAuctionsTableBody.querySelectorAll('.button-edit').forEach(button => {
                    button.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
                });
                adminAuctionsTableBody.querySelectorAll('.button-danger').forEach(button => {
                    button.addEventListener('click', (e) => openConfirmDeleteModal(e.target.dataset.id, e.target.closest('tr').querySelector('td').textContent));
                });
                adminAuctionsTableBody.querySelectorAll('.button-finalize').forEach(button => {
                    button.addEventListener('click', (e) => finalizeAuction(e.target.dataset.id));
                });

            } catch (error) {
                console.error('Error loading admin auctions:', error);
                auctionsLoadingMessage.style.display = 'none';
                showMessage(auctionsErrorMessage, 'Error al cargar las subastas: ' + error.message, 'error');
            }
        }

        // Manejar el envío del formulario de creación de subastas
        if (createAuctionForm) {
            createAuctionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                createAuctionMessage.style.display = 'none'; // Ocultar mensajes anteriores

                const title = document.getElementById('auction-title').value;
                const description = document.getElementById('auction-description').value;
                const imageUrl = document.getElementById('auction-image-url').value;
                const startBid = parseFloat(document.getElementById('auction-start-bid').value);
                const endDate = document.getElementById('auction-end-date').value;

                if (!title || !description || !startBid || !endDate) {
                    showMessage(createAuctionMessage, 'Por favor, rellena todos los campos obligatorios.', 'error');
                    return;
                }

                if (isNaN(startBid) || startBid <= 0) {
                    showMessage(createAuctionMessage, 'La puja inicial debe ser un número positivo.', 'error');
                    return;
                }

                const parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime()) || parsedEndDate <= new Date()) {
                    showMessage(createAuctionMessage, 'La fecha de finalización debe ser una fecha futura válida.', 'error');
                    return;
                }

                try {
                    const response = await fetch(`${BACKEND_URL}/api/auctions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${getAuthToken()}`
                        },
                        body: JSON.stringify({
                            title: title,
                            description: description,
                            imageUrl: imageUrl,
                            startPrice: startBid,
                            endTime: parsedEndDate.toISOString() // Enviar en formato ISO 8601
                        })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        showMessage(createAuctionMessage, 'Subasta creada con éxito!', 'success');
                        createAuctionForm.reset(); // Limpiar el formulario
                        loadAdminAuctions(); // Recargar la tabla de subastas
                    } else {
                        showMessage(createAuctionMessage, `Error al crear subasta: ${result.message || response.statusText}`, 'error');
                    }
                } catch (error) {
                    console.error('Error creating auction:', error);
                    showMessage(createAuctionMessage, 'Error de conexión al crear subasta.', 'error');
                }
            });
        }

        // Abrir modal de edición y cargar datos
        async function openEditModal(auctionId) {
            editAuctionMessage.style.display = 'none'; // Ocultar mensajes anteriores
            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}`, {
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error al cargar datos de la subasta: ${response.statusText}`);
                }

                const auction = await response.json();

                editAuctionId.value = auction._id;
                editTitle.value = auction.title;
                editDescription.value = auction.description;
                editImageUrl.value = auction.imageUrl || '';
                editStartBid.value = auction.startPrice;
                // Formatear la fecha para el input datetime-local
                const date = new Date(auction.endTime);
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                editEndDate.value = `${year}-${month}-${day}T${hours}:${minutes}`;
                editStatus.value = auction.status;

                editAuctionModal.style.display = 'block';
            } catch (error) {
                console.error('Error loading auction for edit:', error);
                showMessage(auctionsErrorMessage, 'Error al cargar subasta para editar: ' + error.message, 'error');
            }
        }

        // Cerrar modal de edición
        if (editAuctionModal) {
            editAuctionModal.querySelector('.close-button').addEventListener('click', () => {
                editAuctionModal.style.display = 'none';
            });
            window.addEventListener('click', (event) => {
                if (event.target === editAuctionModal) {
                    editAuctionModal.style.display = 'none';
                }
            });
        }

        // Manejar envío del formulario de edición
        if (editAuctionForm) {
            editAuctionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                editAuctionMessage.style.display = 'none';

                const id = editAuctionId.value;
                const title = editTitle.value;
                const description = editDescription.value;
                const imageUrl = editImageUrl.value;
                const startBid = parseFloat(editStartBid.value);
                const endDate = editEndDate.value;
                const status = editStatus.value;

                if (!title || !description || !startBid || !endDate) {
                    showMessage(editAuctionMessage, 'Por favor, rellena todos los campos obligatorios.', 'error');
                    return;
                }

                if (isNaN(startBid) || startBid <= 0) {
                    showMessage(editAuctionMessage, 'La puja inicial debe ser un número positivo.', 'error');
                    return;
                }

                const parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime())) { // No se valida si es futura aquí, el backend lo hará.
                    showMessage(editAuctionMessage, 'La fecha de finalización debe ser una fecha válida.', 'error');
                    return;
                }

                try {
                    const response = await fetch(`${BACKEND_URL}/api/auctions/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${getAuthToken()}`
                        },
                        body: JSON.stringify({
                            title,
                            description,
                            imageUrl,
                            startPrice: startBid,
                            endTime: parsedEndDate.toISOString(),
                            status
                        })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        showMessage(editAuctionMessage, 'Subasta actualizada con éxito!', 'success');
                        editAuctionModal.style.display = 'none';
                        loadAdminAuctions(); // Recargar la tabla
                    } else {
                        showMessage(editAuctionMessage, `Error al actualizar subasta: ${result.message || response.statusText}`, 'error');
                    }
                } catch (error) {
                    console.error('Error updating auction:', error);
                    showMessage(editAuctionMessage, 'Error de conexión al actualizar subasta.', 'error');
                }
            });
        }

        // Abrir modal de confirmación de eliminación
        function openConfirmDeleteModal(auctionId, auctionTitle) {
            currentAuctionIdToDelete = auctionId;
            auctionToDeleteTitle.textContent = auctionTitle;
            deleteAuctionMessage.style.display = 'none'; // Ocultar mensajes anteriores
            confirmDeleteModal.style.display = 'block';
        }

        // Cerrar modal de confirmación de eliminación
        if (confirmDeleteModal) {
            confirmDeleteModal.querySelector('.close-button').addEventListener('click', () => {
                confirmDeleteModal.style.display = 'none';
                currentAuctionIdToDelete = null;
            });
            cancelDeleteBtn.addEventListener('click', () => {
                confirmDeleteModal.style.display = 'none';
                currentAuctionIdToDelete = null;
            });
            window.addEventListener('click', (event) => {
                if (event.target === confirmDeleteModal) {
                    confirmDeleteModal.style.display = 'none';
                    currentAuctionIdToDelete = null;
                }
            });
        }

        // Manejar eliminación de subasta
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                if (!currentAuctionIdToDelete) return;

                deleteAuctionMessage.style.display = 'none'; // Ocultar mensajes anteriores

                try {
                    const response = await fetch(`${BACKEND_URL}/api/auctions/${currentAuctionIdToDelete}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${getAuthToken()}`
                        }
                    });

                    const result = await response.json();

                    if (response.ok) {
                        showMessage(deleteAuctionMessage, 'Subasta eliminada con éxito!', 'success');
                        confirmDeleteModal.style.display = 'none';
                        loadAdminAuctions(); // Recargar la tabla
                        currentAuctionIdToDelete = null;
                    } else {
                        showMessage(deleteAuctionMessage, `Error al eliminar subasta: ${result.message || response.statusText}`, 'error');
                    }
                } catch (error) {
                    console.error('Error deleting auction:', error);
                    showMessage(deleteAuctionMessage, 'Error de conexión al eliminar subasta.', 'error');
                }
            });
        }

        // Manejar finalización manual de subasta
        async function finalizeAuction(auctionId) {
            try {
                const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}/finalize`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage(auctionsLoadingMessage, 'Subasta finalizada con éxito!', 'success'); // Reutilizar el mensaje de carga
                    loadAdminAuctions(); // Recargar la tabla
                } else {
                    showMessage(auctionsErrorMessage, `Error al finalizar subasta: ${result.message || response.statusText}`, 'error');
                }
            } catch (error) {
                console.error('Error finalizing auction:', error);
                showMessage(auctionsErrorMessage, 'Error de conexión al finalizar subasta.', 'error');
            }
        }
    }
});
