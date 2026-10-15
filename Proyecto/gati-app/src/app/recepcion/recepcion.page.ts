import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

// Importamos individualmente cada componente visual que usamos en el HTML
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle,
  IonContent, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonItem, IonIcon, IonInput, IonButton, IonText,
  IonList, IonListHeader, IonLabel, IonBadge
} from '@ionic/angular';

@Component({
  selector: 'app-recepcion',
  templateUrl: './recepcion.page.html',
  styleUrls: ['./recepcion.page.scss'],
  standalone: true,
  // Declaramos los componentes para que Angular pueda renderizarlos
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle,
    IonContent, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonItem, IonIcon, IonInput, IonButton, IonText,
    IonList, IonListHeader, IonLabel, IonBadge
  ]
})
export class RecepcionPage {
  numeroOC: string = '';
  ordenData: any = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {}

  async buscarOrden() {
    if (!this.numeroOC.trim()) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.ordenData = null;
    this.cdr.detectChanges();

    try {
      const ocFormateada = this.numeroOC.trim().toUpperCase();
      this.ordenData = await this.apiService.consultarOC(ocFormateada);

      this.cdr.detectChanges();

    } catch (error: any) {
      this.errorMessage = error.message;
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
