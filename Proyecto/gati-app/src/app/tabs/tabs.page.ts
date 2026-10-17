import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';



// 1. IMPORTAMOS FIREBASE Y TU SERVICIO DE BASE DE DATOS
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { DatabaseService } from '../services/database.service';

import {
  IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle,
  IonContent, IonList, IonItem, IonIcon, IonLabel,
  IonRouterOutlet, IonMenuToggle
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  homeOutline, cubeOutline, documentTextOutline,
  peopleOutline, settingsOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonSplitPane, IonMenu, IonHeader, IonToolbar,
    IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel,
    IonRouterOutlet, IonMenuToggle
  ],
})
export class TabsPage {
  // Variable que controla el candado visual
  isAdmin: boolean = false;

  // Inyectamos las herramientas
  private auth = inject(Auth);
  private dbService = inject(DatabaseService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({ homeOutline, cubeOutline, documentTextOutline, peopleOutline, settingsOutline });

    // 2. ESCUCHAMOS EN TIEMPO REAL QUIÉN INICIA SESIÓN
    onAuthStateChanged(this.auth, async (user) => {
      if (user && user.email) {
        // Le preguntamos a Firestore si este correo tiene el rol de Administrador
        this.isAdmin = await this.dbService.esAdministrador(user.email);
      } else {
        // Si no hay usuario o cierra sesión, ocultamos por seguridad
        this.isAdmin = false;
      }
      this.cdr.detectChanges();
    });
  }
}
