// script.js

document.addEventListener('DOMContentLoaded', () => {
    // URL de tu backend de Render
    const BACKEND_URL = 'https://guerra-mundial-z-backend.onrender.com';

    // Referencias a elementos del DOM (autenticación)
    const loginButton = document.getElementById('loginButton'); // Cambiado de 'login-button' para admin.html
    const logoutButton = document.getElementById('logoutButton'); // Cambiado de 'logout-button'
    const userInfo = document.getElementById('userInfo'); // Contenedor de info de usuario
    const userAvatar = document.getElementById('userAvatar'); // Cambiado de 'user-avatar'
    const usernameDisplay = document.getElementById('usernameDisplay'); // Cambiado de 'user-name'

    const createAuctionBtn = document.getElementById('createAuctionBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn'); // Nuevo: botón del panel de admin

    // Elementos específicos del panel de administración
    const adminAuctionList = document.getElementById('adminAuctionList');
    const loadingMessage = document.getElementById('loadingMessage');
    const noAuctionsMessage = document.getElementById('noAuctionsMessage');

    // Elementos del modal de edición
    const editAuctionModal = document.getElementById('editAuctionModal');
    const editAuctionForm = document.getElementById('editAuctionForm');
    const editAuctionId = document.getElementById('editAuctionId');
    const editTitle = document.getElementById('editTitle');
    const editDescription = document.getElementById('editDescription');
    const editImageUrl = document.getElementById('editImageUrl');
    const editStartBid = document.getElementById('editStartBid');
    const editEndDate = document.getElementById('editEndDate');
    const formMessage = editAuctionForm ? editAuctionForm.querySelector('.form-message') : null;

    // Función para guardar el token JWT
    function setAuthToken(token) {
        if (token) {
            localStorage.setItem('jwtToken', token);
        } else {
            localStorage.removeItem('jwtToken');
        }
        updateAuthUI();
    }

    // Función para obtener el token JWT
    function getAuthToken() {
        return localStorage.getItem('jwtToken');
    }

    // Función para decodificar el token JWT
    function decodeJwtToken(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            console.error('Error decodificando el token:', e);
            return null;
        }
    }

    // Función para actualizar la UI de autenticación
    async function updateAuthUI() {
        const token = getAuthToken();
        if (token) {
            const decodedToken = decodeJwtToken(token);
            if (decodedToken && decodedToken.exp * 1000 > Date.now()) { // Verificar expiración
                try {
                    const response = await fetch(`${BACKEND_URL}/api/user`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const user = await response.json();
                        loginButton.style.display = 'none';
                        userInfo.style.display = 'flex';
                        userAvatar.src = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'images/default_avatar.png';
                        usernameDisplay.textContent = user.username;

                        // Mostrar botones basados en roles (si aplica en subastas.html)
                        // Para admin.html, el hecho de estar aquí implica que ya es admin
                        // pero aún podemos usar createAuctionBtn si quisiéramos.
                        if (decodedToken.isAdmin) {
                            createAuctionBtn.style.display = 'inline-block';
                            adminPanelBtn.style.display = 'inline-block'; // Mostrar el botón del panel admin
                        } else {
                            createAuctionBtn.style.display = 'none';
                            adminPanelBtn.style.display = 'none';
                        }
                        // Redirigir si no es admin y está en admin.html
                        if (window.location.pathname.includes('admin.html') && !decodedToken.isAdmin) {
                            window.location.href = 'index.html'; // Redirigir si no es admin
                        }
                    } else {
                        // Token inválido o expirado, limpiar y mostrar login
                        setAuthToken(null);
                        loginButton.style.display = 'block';
                        userInfo.style.display = 'none';
                        if (window.location.pathname.includes('admin.html')) {
                             window.location.href = 'index.html'; // Redirigir si no es admin y token falla
                        }
                    }
                } catch (error) {
                    console.error('Error al obtener información del usuario:', error);
                    setAuthToken(null); // Limpiar token en caso de error de red o backend
                    loginButton.style.display = 'block';
                    userInfo.style.display = 'none';
                    if (window.location.pathname.includes('admin.html')) {
                        window.location.href = 'index.html'; // Redirigir si hay error de fetch
                    }
                }
            } else {
                setAuthToken(null); // Token expirado
                loginButton.style.display = 'block';
                userInfo.style.display = 'none';
                if (window.location.pathname.includes('admin.html')) {
                    window.location.href = 'index.html'; // Redirigir si token expiró
                }
            }
        } else {
            loginButton.style.display = 'block';
            userInfo.style.display = 'none';
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = 'index.html'; // Redirigir si no hay token
            }
        }
    }

    // Manejar el token JWT de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        setAuthToken(token);
        // Limpiar el token de la URL después de guardarlo
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Event Listeners para autenticación
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            window.location.href = `${BACKEND_URL}/auth/discord`;
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/logout`);
                if (response.ok) {
                    setAuthToken(null); // Borrar el token del localStorage
                    alert('Sesión cerrada correctamente.');
                    window.location.href = 'index.html';
                } else {
                    alert('Error al cerrar sesión.');
                }
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                alert('Error de conexión al cerrar sesión.');
            }
        });
    }

    // Navegación para crear subasta y panel admin
    if (createAuctionBtn) {
        createAuctionBtn.addEventListener('click', () => {
            window.location.href = 'subastas.html'; // O abrir modal si fuera en la misma página
        });
    }

    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            window.location.href = 'admin.html';
        });
    }

    // --- Lógica específica para admin.html ---

    // Función para formatear la fecha para input datetime-local
    function formatDateTimeLocal(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Función para renderizar una sola tarjeta de subasta en el panel de admin
    function renderAdminAuctionCard(auction) {
        const auctionCard = document.createElement('div');
        auctionCard.className = 'auction-card';
        auctionCard.dataset.id = auction._id; // Almacenar el ID de la subasta

        const endDate = new Date(auction.endDate);
        const now = new Date();
        const isActive = auction.isActive && endDate > now;
        const statusText = isActive ? 'Activa' : 'Finalizada';
        const statusClass = isActive ? 'status-active' : 'status-ended';

        auctionCard.innerHTML = `
            <img src="${auction.imageUrl || 'images/default_auction.webp'}" alt="${auction.title}">
            <div class="auction-info">
                <h3>${auction.title}</h3>
                <p><strong>Descripción:</strong> ${auction.description}</p>
                <p><strong>Creador:</strong> ${auction.creatorName}</p>
                <p><strong>Puja Inicial:</strong> ${auction.startBid} Rublos</p>
                <p><strong>Puja Actual:</strong> <span class="current-bid">${auction.currentBid} Rublos</span></p>
                ${auction.currentBidderName ? `<p><strong>Mejor Postor:</strong> ${auction.currentBidderName}</p>` : ''}
                <p><strong>Finaliza:</strong> <span class="countdown" data-end-date="${auction.endDate}">${endDate.toLocaleString()}</span></p>
                <p><strong>Estado:</strong> <span class="${statusClass}">${statusText}</span></p>
                <div class="admin-actions">
                    <button class="button edit-auction-btn" data-id="${auction._id}">Editar</button>
                    <button class="button delete-auction-btn" data-id="${auction._id}">Eliminar</button>
                </div>
            </div>
        `;
        adminAuctionList.appendChild(auctionCard);
    }

    // Función para obtener y mostrar todas las subastas para el admin
    async function fetchAdminAuctions() {
        if (!adminAuctionList) return; // Asegurarse de que estamos en admin.html

        loadingMessage.style.display = 'block';
        noAuctionsMessage.style.display = 'none';
        adminAuctionList.innerHTML = ''; // Limpiar lista antes de cargar

        try {
            const token = getAuthToken();
            if (!token) {
                alert('No autenticado. Por favor, inicia sesión.');
                window.location.href = 'index.html';
                return;
            }

            const response = await fetch(`${BACKEND_URL}/api/admin/auctions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const auctions = await response.json();
                loadingMessage.style.display = 'none';

                if (auctions.length > 0) {
                    auctions.forEach(auction => renderAdminAuctionCard(auction));
                    startCountdowns(adminAuctionList.querySelectorAll('.countdown')); // Iniciar contadores para el admin panel
                } else {
                    noAuctionsMessage.style.display = 'block';
                }
            } else if (response.status === 401 || response.status === 403) {
                alert('No autorizado para acceder al panel de administración. Por favor, asegúrate de tener los permisos.');
                window.location.href = 'index.html';
            } else {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error al cargar subastas para administración:', error);
            loadingMessage.textContent = 'Error al cargar subastas. Por favor, inténtalo de nuevo más tarde.';
            loadingMessage.style.color = 'var(--error-color)';
        }
    }

    // Lógica para abrir el modal de edición
    window.openEditModal = async (auctionId) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const auction = await response.json();
                editAuctionId.value = auction._id;
                editTitle.value = auction.title;
                editDescription.value = auction.description;
                editImageUrl.value = auction.imageUrl || '';
                editStartBid.value = auction.startBid;
                editEndDate.value = formatDateTimeLocal(auction.endDate); // Formatear fecha
                formMessage.style.display = 'none'; // Limpiar mensajes previos
                editAuctionModal.style.display = 'block';
            } else {
                throw new Error('No se pudo cargar la subasta para edición.');
            }
        } catch (error) {
            console.error('Error abriendo modal de edición:', error);
            alert('Error al cargar la subasta para edición: ' + error.message);
        }
    };

    // Lógica para cerrar el modal de edición
    window.closeEditModal = () => {
        editAuctionModal.style.display = 'none';
        formMessage.style.display = 'none';
        formMessage.textContent = '';
    };

    // Manejar el envío del formulario de edición
    if (editAuctionForm) {
        editAuctionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const auctionId = editAuctionId.value;
            const updatedData = {
                title: editTitle.value,
                description: editDescription.value,
                imageUrl: editImageUrl.value,
                startBid: parseFloat(editStartBid.value),
                endDate: editEndDate.value // Ya está en formato ISO para el backend
            };

            try {
                const token = getAuthToken();
                const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedData)
                });

                if (response.ok) {
                    const updatedAuction = await response.json();
                    formMessage.textContent = 'Subasta actualizada con éxito.';
                    formMessage.style.color = 'var(--success-color)';
                    setTimeout(() => {
                        closeEditModal();
                        fetchAdminAuctions(); // Recargar la lista para ver los cambios
                    }, 1500);
                } else {
                    const errorData = await response.json();
                    formMessage.textContent = `Error: ${errorData.message || response.statusText}`;
                    formMessage.style.color = 'var(--error-color)';
                }
            } catch (error) {
                console.error('Error al actualizar subasta:', error);
                formMessage.textContent = 'Error de conexión al actualizar subasta.';
                formMessage.style.color = 'var(--error-color)';
            } finally {
                formMessage.style.display = 'block';
            }
        });
    }

    // Lógica para eliminar subasta
    window.deleteAuction = async (auctionId) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta subasta? Esta acción es irreversible.')) {
            return;
        }

        try {
            const token = getAuthToken();
            const response = await fetch(`${BACKEND_URL}/api/auctions/${auctionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert('Subasta eliminada con éxito.');
                fetchAdminAuctions(); // Recargar la lista para reflejar la eliminación
            } else if (response.status === 404) {
                alert('La subasta no fue encontrada.');
            } else {
                const errorData = await response.json();
                alert(`Error al eliminar subasta: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Error al eliminar subasta:', error);
            alert('Error de conexión al eliminar subasta.');
        }
    };

    // Delegación de eventos para botones de edición y eliminación
    if (adminAuctionList) {
        adminAuctionList.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('edit-auction-btn')) {
                const auctionId = target.dataset.id;
                openEditModal(auctionId);
            } else if (target.classList.contains('delete-auction-btn')) {
                const auctionId = target.dataset.id;
                deleteAuction(auctionId);
            }
        });
    }


    // Llamada inicial para cargar subastas en admin.html
    if (window.location.pathname.includes('admin.html')) {
        updateAuthUI().then(() => { // Asegurarse de que la UI de auth esté actualizada y redirija si no es admin
            const token = getAuthToken();
            if (token) {
                const decodedToken = decodeJwtToken(token);
                if (decodedToken && decodedToken.isAdmin) {
                    fetchAdminAuctions();
                } else {
                     // Si el token no es admin, updateAuthUI ya debería haber redirigido
                     // Esto es un fallback, si por alguna razón no se redirigió antes
                    window.location.href = 'index.html';
                }
            }
        });
    } else {
        // Para otras páginas como index.html o subastas.html
        updateAuthUI();
    }


    // --- Funciones existentes de countdown (asegurarse de que estén aquí o sean importadas) ---
    // Esta parte ya estaba en tu script.js y es crucial para los contadores.
    // Asegúrate de que esta función esté definida para que los contadores en admin.html funcionen.
    function startCountdowns(countdownElements) {
        countdownElements.forEach(countdownElement => {
            const endDate = new Date(countdownElement.dataset.endDate).getTime();

            const updateCountdown = () => {
                const now = new Date().getTime();
                const distance = endDate - now;

                if (distance < 0) {
                    countdownElement.innerHTML = '¡Finalizada!';
                    // En el panel de admin, no deshabilitamos botones de puja
                    // Podrías cambiar el estilo de la tarjeta si la subasta ha terminado
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