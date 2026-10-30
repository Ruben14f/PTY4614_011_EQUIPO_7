import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';

import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonItem, IonInput, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonSegment, IonSegmentButton,
  IonLabel, IonBadge, IonFab, IonFabButton, IonModal, ToastController, AlertController,
  ActionSheetController // <-- Añadido
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  logOutOutline, add, closeOutline, peopleOutline, shieldCheckmarkOutline,
  briefcaseOutline, personOutline, mailOutline, idCardOutline, ellipsisVertical, // <-- Añadido
  swapVerticalOutline, powerOutline // <-- Añadidos
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
  viewMode: string = 'funcionarios';

  isModalFuncionarioOpen: boolean = false;
  isModalUsuarioOpen: boolean = false;
  isSaving: boolean = false;

  funcionarioForm: FormGroup;
  usuarioForm: FormGroup;

  listaFuncionarios: any[] = [];
  listaUsuarios: any[] = [];

  private auth = inject(Auth);
  private router = inject(Router);
  private dbService = inject(DatabaseService);
  private toastCtrl = inject(ToastController);
  private alertController = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);
  private actionSheetCtrl = inject(ActionSheetController); // <-- Añadido

  constructor(private fb: FormBuilder) {
    addIcons({
      logOutOutline, add, closeOutline, peopleOutline, shieldCheckmarkOutline,
      briefcaseOutline, personOutline, mailOutline, idCardOutline, ellipsisVertical,
      swapVerticalOutline, powerOutline
    });

    this.funcionarioForm = this.fb.group({
      rut: ['', Validators.required],
      nombreCompleto: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      area: ['', Validators.required],
      cargo: ['', Validators.required]
    });

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

  setModalUsuario(isOpen: boolean) {
    this.isModalUsuarioOpen = isOpen;
    if (!isOpen) this.usuarioForm.reset({ rol: 'Técnico', estado: 'Activo' });
  }

  async guardarUsuario() {
    if (this.usuarioForm.invalid) return this.usuarioForm.markAllAsTouched();
    this.isSaving = true;

    try {
      const nuevoUsuario = this.usuarioForm.value;
      await this.dbService.registrarUsuarioSistema(nuevoUsuario);

      this.mostrarMensaje(`Se ha autorizado a ${nuevoUsuario.correo} para registrarse.`, 'success');
      this.setModalUsuario(false);
      this.cargarDatos();
    } catch (error) {
      this.mostrarMensaje('Error al guardar la autorización.', 'danger');
      console.error(error);
    } finally {
      this.isSaving = false;
    }
  }

  // --- NUEVA LÓGICA: GESTIÓN DE USUARIOS ---
  async abrirOpcionesUsuario(usuario: any) {
    // 1. Evitar que el admin activo se cambie de rol a sí mismo (y pierda acceso)
    const currentEmail = this.auth.currentUser?.email;
    if (usuario.correo === currentEmail) {
      this.mostrarMensaje('No puedes modificar tu propia cuenta activa por seguridad.', 'warning');
      return;
    }

    const botones = [];

    // 2. Opción para cambiar de rol (Técnico <-> Administrador)
    if (usuario.estado === 'Activo') {
      const nuevoRol = usuario.rol === 'Administrador' ? 'Técnico' : 'Administrador';
      botones.push({
        text: `Convertir en ${nuevoRol}`,
        icon: 'swap-vertical-outline',
        handler: () => {
          this.cambiarRolUsuario(usuario, nuevoRol);
        }
      });
    }

    // 3. Opción para dar de baja o reactivar
    if (usuario.estado === 'Activo') {
      botones.push({
        text: 'Desactivar / Dar de Baja',
        icon: 'power-outline',
        role: 'destructive',
        handler: () => {
          this.cambiarEstadoUsuario(usuario, 'Inactivo');
        }
      });
    } else {
      botones.push({
        text: 'Reactivar Cuenta',
        icon: 'power-outline',
        handler: () => {
          this.cambiarEstadoUsuario(usuario, 'Activo');
        }
      });
    }

    // 4. Botón de cancelar
    botones.push({ text: 'Cancelar', icon: 'close-outline', role: 'cancel' });

    const actionSheet = await this.actionSheetCtrl.create({
      header: `Gestionar: ${usuario.correo}`,
      buttons: botones
    });

    await actionSheet.present();
  }

  async cambiarRolUsuario(usuario: any, nuevoRol: string) {
    try {
      await this.dbService.actualizarRolUsuario(usuario.id, nuevoRol);
      this.mostrarMensaje(`Rol actualizado a ${nuevoRol} exitosamente.`, 'success');
      this.cargarDatos();
    } catch (error) {
      this.mostrarMensaje('Error al cambiar el rol.', 'danger');
    }
  }

  async cambiarEstadoUsuario(usuario: any, nuevoEstado: string) {
    try {
      await this.dbService.actualizarEstadoUsuario(usuario.id, nuevoEstado);
      const colorMsg = nuevoEstado === 'Activo' ? 'success' : 'warning';
      this.mostrarMensaje(`El usuario ahora está ${nuevoEstado}.`, colorMsg);
      this.cargarDatos();
    } catch (error) {
      this.mostrarMensaje('Error al cambiar el estado.', 'danger');
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
