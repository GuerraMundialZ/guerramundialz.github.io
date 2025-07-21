<<<<<<< HEAD
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
=======
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
>>>>>>> 5c86c0de86b78e4e1c9f7ca6cd685f9cdc335e06
});