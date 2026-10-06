import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

export const authGuard: CanActivateFn = (route, state) => {
  // Inyectamos las herramientas de Firebase y el Enrutador
  const auth = inject(Auth);
  const router = inject(Router);

  // Usamos una Promesa para darle tiempo a Firebase de verificar la sesión
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Si hay un usuario activo, abrimos el candado
        resolve(true);
      } else {
        // Si no hay usuario, bloqueamos el paso y lo pateamos al Login
        router.navigate(['/login']);
        resolve(false);
      }
    });
  });
};
