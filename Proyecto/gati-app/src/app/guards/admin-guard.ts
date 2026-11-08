import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { DatabaseService } from '../services/database.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const dbService = inject(DatabaseService);

  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        // Si hay usuario, le preguntamos a la Base de Datos si es Administrador
        const isAdmin = await dbService.esAdministrador(user.email);

        if (isAdmin) {
          resolve(true); // Es admin, lo dejamos pasar
        } else {
          // Es Técnico (o sin permisos), lo mandamos al Dashboard
          router.navigate(['/tabs/dashboard']);
          resolve(false);
        }
      } else {
        // Si no hay nadie logueado, al login
        router.navigate(['/login']);
        resolve(false);
      }
    });
  });
};
