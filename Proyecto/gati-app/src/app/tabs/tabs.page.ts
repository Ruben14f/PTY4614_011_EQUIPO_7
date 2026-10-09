import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // 1. IMPORTAMOS EL MOTOR DE RUTAS

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
    RouterModule, // 2. LO AGREGAMOS A LA LISTA
    IonSplitPane, IonMenu, IonHeader, IonToolbar,
    IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel,
    IonRouterOutlet, IonMenuToggle
  ],
})
export class TabsPage {
  constructor() {
    addIcons({ homeOutline, cubeOutline, documentTextOutline, peopleOutline, settingsOutline });
  }
}
