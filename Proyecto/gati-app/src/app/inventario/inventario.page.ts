import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon, IonGrid, IonRow, IonCol, IonText,
  ToastController
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import { saveOutline, hardwareChipOutline, checkmarkCircleOutline } from 'ionicons/icons';

// Importamos el servicio que acabamos de crear
import { DatabaseService } from '../services/database.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon, IonGrid, IonRow, IonCol, IonText
  ]
})
export class InventarioPage implements OnInit {

  equipoForm: FormGroup;
  isSaving: boolean = false; // Variable para evitar doble clic

  constructor(
    private fb: FormBuilder,
    private dbService: DatabaseService, // Inyectamos la base de datos
    private toastCtrl: ToastController  // Inyectamos las alertas
  ) {
    addIcons({ saveOutline, hardwareChipOutline, checkmarkCircleOutline });

    this.equipoForm = this.fb.group({
      tipo: ['', Validators.required],
      marca: ['', Validators.required],
      modelo: ['', Validators.required],
      numeroSerie: ['', Validators.required],
      numeroOC: ['', Validators.required],
      estado: ['En inventario', Validators.required]
    });
  }

  ngOnInit() {}

  async guardarEquipo() {
    if (this.equipoForm.valid) {
      this.isSaving = true;
      const nuevoEquipo = this.equipoForm.value;

      try {
        // Llamamos al servicio para guardar en Firebase
        await this.dbService.registrarHardware(nuevoEquipo);

        // Mostramos el mensaje de éxito verde en pantalla
        const toast = await this.toastCtrl.create({
          message: 'Equipo registrado exitosamente en la base de datos.',
          duration: 2500,
          position: 'top',
          color: 'success',
          icon: 'checkmark-circle-outline'
        });
        await toast.present();

        // Limpiamos el formulario para el siguiente equipo
        this.equipoForm.reset({ estado: 'En inventario' });
      } catch (error) {
        const toast = await this.toastCtrl.create({
          message: 'Error de conexión. Revisa los permisos de Firebase.',
          duration: 3000,
          position: 'top',
          color: 'danger'
        });
        await toast.present();
      } finally {
        this.isSaving = false;
      }
    } else {
      this.equipoForm.markAllAsTouched();
    }
  }
}
