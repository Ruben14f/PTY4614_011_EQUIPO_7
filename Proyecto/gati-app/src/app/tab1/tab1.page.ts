import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
// Importamos el ToastController y los componentes visuales
import { ToastController, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
})
export class Tab1Page {

  constructor(
    private auth: Auth,
    private router: Router,
    private toastController: ToastController // <-- Inyectamos el creador de notificaciones
  ) {}

  async onLogout() {
    try {
      // 1. Le decimos a Firebase que cierre la sesión
      await signOut(this.auth);

      // 2. Creamos la notificación corporativa (Toast)
      const toast = await this.toastController.create({
        message: 'Has cerrado sesión exitosamente.',
        duration: 2500, // Desaparece en 2.5 segundos
        position: 'top',
        color: 'success' // Color verde
      });
      await toast.present(); // Mostramos el mensaje

      // 3. Devolvemos al usuario a la pantalla de Login
      this.router.navigate(['/login']);

    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}
