import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import emailjs from '@emailjs/browser';

import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonItem, IonInput, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonSegment, IonSegmentButton,
  IonLabel, IonBadge, IonFab, IonFabButton, IonModal, ToastController, AlertController,
  ActionSheetController
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  logOutOutline, add, closeOutline, peopleOutline, shieldCheckmarkOutline,
  briefcaseOutline, personOutline, mailOutline, idCardOutline, ellipsisVertical,
  swapVerticalOutline, powerOutline, trashOutline
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
  private actionSheetCtrl = inject(ActionSheetController);

  constructor(private fb: FormBuilder) {
    addIcons({
      logOutOutline, add, closeOutline, peopleOutline, shieldCheckmarkOutline,
      briefcaseOutline, personOutline, mailOutline, idCardOutline, ellipsisVertical,
      swapVerticalOutline, powerOutline, trashOutline
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

  // --- NUEVO: FORMATEADOR DE RUT EN TIEMPO REAL ---
  formatearRut(event: any) {
    // 1. Quitamos todo lo que no sea número o la letra K (mayúscula o minúscula)
    let valor = event.target.value.replace(/[^0-9kK]/g, '');

    if (valor.length > 1) {
      // 2. Separamos el cuerpo del dígito verificador
      let cuerpo = valor.slice(0, -1);
      let dv = valor.slice(-1).toUpperCase(); // Forzamos la K a mayúscula

      // 3. Le agregamos los puntos al cuerpo cada 3 dígitos
      cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

      // 4. Unimos todo con el guion
      const rutFormateado = `${cuerpo}-${dv}`;

      // 5. Actualizamos el formulario y la vista en tiempo real
      this.funcionarioForm.patchValue({ rut: rutFormateado }, { emitEvent: false });
      event.target.value = rutFormateado;
    } else {
      // Si solo ha escrito 1 número, lo dejamos tal cual
      this.funcionarioForm.patchValue({ rut: valor }, { emitEvent: false });
      event.target.value = valor;
    }
  }

  async guardarFuncionario() {
    if (this.funcionarioForm.invalid) return this.funcionarioForm.markAllAsTouched();
    this.isSaving = true;

    try {
      // Aplicamos toLowerCase y trim al correo antes de guardarlo
      const nuevoFuncionario = {
        ...this.funcionarioForm.value,
        correo: this.funcionarioForm.value.correo.toLowerCase().trim()
      };

      await this.dbService.registrarFuncionario(nuevoFuncionario);
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
      // Aplicamos toLowerCase y trim al correo antes de guardarlo
      const nuevoUsuario = {
        ...this.usuarioForm.value,
        correo: this.usuarioForm.value.correo.toLowerCase().trim()
      };

      // 1. Guardamos la autorización en la Base de Datos (Firestore)
      await this.dbService.registrarUsuarioSistema(nuevoUsuario);

      // 2. Enviamos el correo de invitación por EmailJS
      try {
        await emailjs.send(
          'service_xu4p6bf',       // Tu Service ID
          'template_ok01sni',      // Tu Template ID
          {
            to_email: nuevoUsuario.correo,
            rol: nuevoUsuario.rol,
            link_acceso: 'https://gati-mop.web.app/login'
          },
          '84dnCsFctzHBhcZBA'      // Tu Public Key
        );
        this.mostrarMensaje(`Se ha autorizado e invitado a ${nuevoUsuario.correo}.`, 'success');
      } catch (emailError) {
        console.warn('Fallo el envío de EmailJS:', emailError);
        this.mostrarMensaje(`Usuario creado, pero no se pudo enviar el correo de invitación.`, 'warning');
      }

      this.setModalUsuario(false);
      this.cargarDatos();
    } catch (error) {
      this.mostrarMensaje('Error al guardar la autorización.', 'danger');
      console.error(error);
    } finally {
      this.isSaving = false;
    }
  }

  async abrirOpcionesFuncionario(funcionario: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Gestionar: ${funcionario.nombreCompleto}`,
      buttons: [
        { text: 'Eliminar Funcionario', icon: 'trash-outline', role: 'destructive', data: 'eliminar' },
        { text: 'Cancelar', icon: 'close-outline', role: 'cancel' }
      ]
    });
    await actionSheet.present();
    const { data } = await actionSheet.onDidDismiss();

    if (data === 'eliminar') {
      const alert = await this.alertController.create({
        header: 'Confirmar Eliminación',
        message: `¿Estás seguro que deseas eliminar a ${funcionario.nombreCompleto} de la base de datos?`,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Eliminar', role: 'destructive',
            handler: async () => {
              try {
                await this.dbService.eliminarFuncionario(funcionario.id);
                this.mostrarMensaje('Funcionario eliminado correctamente.', 'success');
                this.cargarDatos();
              } catch (error) {
                this.mostrarMensaje('Error al eliminar.', 'danger');
              }
            }
          }
        ]
      });
      await alert.present();
    }
  }

  // --- LÓGICA CON ANIMACIÓN CORREGIDA (onDidDismiss) ---
  async abrirOpcionesUsuario(usuario: any) {
    const currentEmail = this.auth.currentUser?.email;
    if (usuario.correo === currentEmail) {
      this.mostrarMensaje('No puedes modificar tu propia cuenta activa por seguridad.', 'warning');
      return;
    }

    const botones = [];

    if (usuario.estado === 'Activo') {
      const nuevoRol = usuario.rol === 'Administrador' ? 'Técnico' : 'Administrador';
      botones.push({ text: `Convertir en ${nuevoRol}`, icon: 'swap-vertical-outline', data: { accion: 'rol', valor: nuevoRol } });
      botones.push({ text: 'Desactivar / Dar de Baja', icon: 'power-outline', role: 'destructive', data: { accion: 'estado', valor: 'Inactivo' } });
    } else {
      botones.push({ text: 'Reactivar Cuenta', icon: 'power-outline', data: { accion: 'estado', valor: 'Activo' } });
    }
    // Agrega este botón a la lista
    botones.push({ text: 'Eliminar Definitivamente', icon: 'trash-outline', role: 'destructive', data: { accion: 'eliminar' } });

    botones.push({ text: 'Cancelar', icon: 'close-outline', role: 'cancel' });

    const actionSheet = await this.actionSheetCtrl.create({
      header: `Gestionar: ${usuario.correo}`,
      buttons: botones
    });

    await actionSheet.present();

    // Esperamos a que la hoja se cierre completamente para evitar congelamiento
    const { data } = await actionSheet.onDidDismiss();

    if (data) {
      if (data.accion === 'rol') {
        this.cambiarRolUsuario(usuario, data.valor);
      } else if (data.accion === 'estado') {
        this.cambiarEstadoUsuario(usuario, data.valor);
      } else if (data.accion === 'eliminar') { // <-- NUEVO
        this.eliminarUsuarioFisicamente(usuario);
      }
    }
  }

  async eliminarUsuarioFisicamente(usuario: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `Esto borrará de la base de datos a ${usuario.correo}. ¿Continuar?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: async () => {
            try {
              await this.dbService.eliminarUsuarioSistema(usuario.id);
              this.mostrarMensaje('Usuario eliminado correctamente.', 'success');
              this.cargarDatos();
            } catch (error) {
              this.mostrarMensaje('Error al eliminar.', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

async cambiarRolUsuario(usuario: any, nuevoRol: string) {
    try {
      await this.dbService.actualizarRolUsuario(usuario.id, nuevoRol);

      // 1. Actualizamos el dato localmente en la memoria de la pantalla
      usuario.rol = nuevoRol;

      this.mostrarMensaje(`Rol actualizado a ${nuevoRol} exitosamente.`, 'success');

      // 2. Le decimos a Angular que refresque la vista al instante
      this.cdr.detectChanges();
    } catch (error) {
      this.mostrarMensaje('Error al cambiar el rol.', 'danger');
    }
  }

 async cambiarEstadoUsuario(usuario: any, nuevoEstado: string) {
    try {
      await this.dbService.actualizarEstadoUsuario(usuario.id, nuevoEstado);

      // 1. Actualizamos el estado localmente
      usuario.estado = nuevoEstado;

      const colorMsg = nuevoEstado === 'Activo' ? 'success' : 'warning';
      this.mostrarMensaje(`El usuario ahora está ${nuevoEstado}.`, colorMsg);

      // 2. Forzamos la actualización visual
      this.cdr.detectChanges();
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
