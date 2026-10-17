import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';

import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonItem, IonInput, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonSegment, IonSegmentButton,
  IonLabel, IonBadge, IonFab, IonFabButton, IonModal, ToastController, AlertController
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  logOutOutline, add, closeOutline, peopleOutline, shieldCheckmarkOutline,
  briefcaseOutline, personOutline, mailOutline, idCardOutline
} from 'ionicons/icons';

import { DatabaseService } from '../services/database.service';

@Component({
  selector: 'app-administracion',
  templateUrl: './administracion.page.html',
  styleUrls: ['./administracion.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
    IonCard, IonCardContent, IonItem, IonInput, IonSelect, IonSelectOption,
    IonButton, IonIcon, IonSegment, IonSegmentButton,
    IonLabel, IonBadge, IonFab, IonFabButton, IonModal
  ]
})
export class AdministracionPage {
  viewMode: string = 'funcionarios'; // Controla qué pestaña estamos viendo

  // Modales
  isModalFuncionarioOpen: boolean = false;
  isModalUsuarioOpen: boolean = false;
  isSaving: boolean = false;

  // Formularios
  funcionarioForm: FormGroup;
  usuarioForm: FormGroup;

  // Listas de datos
  listaFuncionarios: any[] = [];
  listaUsuarios: any[] = [];

  private auth = inject(Auth);
  private router = inject(Router);
  private dbService = inject(DatabaseService);
  private toastCtrl = inject(ToastController);
  private alertController = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);

  constructor(private fb: FormBuilder) {
    addIcons({
      logOutOutline, add, closeOutline, peopleOutline, shieldCheckmarkOutline,
      briefcaseOutline, personOutline, mailOutline, idCardOutline
    });

    // Formulario para Empleados del MOP
    this.funcionarioForm = this.fb.group({
      rut: ['', Validators.required],
      nombreCompleto: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      area: ['', Validators.required],
      cargo: ['', Validators.required]
    });

    // Formulario para Usuarios del Sistema (Técnicos/Admins)
    this.usuarioForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      rol: ['Técnico', Validators.required],
      estado: ['Activo', Validators.required]
    });
  }

  ionViewWillEnter() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.listaFuncionarios = await this.dbService.obtenerFuncionarios();
    this.listaUsuarios = await this.dbService.obtenerUsuariosSistema();
    this.cdr.detectChanges();
  }

  // --- LÓGICA DE FUNCIONARIOS ---
  setModalFuncionario(isOpen: boolean) {
    this.isModalFuncionarioOpen = isOpen;
    if (!isOpen) this.funcionarioForm.reset();
  }

  async guardarFuncionario() {
    if (this.funcionarioForm.invalid) return this.funcionarioForm.markAllAsTouched();
    this.isSaving = true;

    try {
      await this.dbService.registrarFuncionario(this.funcionarioForm.value);
      this.mostrarMensaje('Funcionario registrado exitosamente.', 'success');
      this.setModalFuncionario(false);
      this.cargarDatos();
    } catch (error) {
      this.mostrarMensaje('Error al guardar funcionario.', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  // --- LÓGICA DE USUARIOS ---
  setModalUsuario(isOpen: boolean) {
    this.isModalUsuarioOpen = isOpen;
    if (!isOpen) this.usuarioForm.reset({ rol: 'Técnico', estado: 'Activo' });
  }

async guardarUsuario() {
    if (this.usuarioForm.invalid) return this.usuarioForm.markAllAsTouched();
    this.isSaving = true;

    try {
      const nuevoUsuario = this.usuarioForm.value;

      // SOLO guardamos el perfil (Correo, Rol y Estado) en nuestra base de datos.
      // Firebase Auth no se toca aquí. El usuario creará su propia cuenta después.
      await this.dbService.registrarUsuarioSistema(nuevoUsuario);

      this.mostrarMensaje(`Se ha autorizado a ${nuevoUsuario.correo} para registrarse en el sistema.`, 'success');
      this.setModalUsuario(false);
      this.cargarDatos();

    } catch (error) {
      this.mostrarMensaje('Error al guardar la autorización del usuario.', 'danger');
      console.error(error);
    } finally {
      this.isSaving = false;
    }
  }

  async onLogout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir del sistema GATI?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, salir',
          handler: async () => {
            await signOut(this.auth);
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje, duration: 2500, position: 'top', color: color
    });
    await toast.present();
  }
}
