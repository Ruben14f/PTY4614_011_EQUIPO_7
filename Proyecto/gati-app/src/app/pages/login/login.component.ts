import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from '@angular/fire/auth';
import { IonContent, IonInput, IonButton, ToastController } from '@ionic/angular';

import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    IonContent, IonInput, IonButton
  ]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isRegisterMode: boolean = false;
  isLoading: boolean = false;

  private dbService = inject(DatabaseService);

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private toastController: ToastController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      // Volvemos al validador básico para que deje pasar tu contraseña "123456" en el Login
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.loginForm.reset();
  }

  async recuperarContrasena() {
    const email = this.loginForm.get('email')?.value;

    if (!email) {
      this.mostrarMensaje('Por favor, escribe tu correo en el formulario primero.', 'warning');
      return;
    }

    this.isLoading = true;
    try {
      await sendPasswordResetEmail(this.auth, email);
      this.mostrarMensaje('Te enviamos un enlace de recuperación. Revisa tu bandeja de entrada o SPAM.', 'success');
    } catch (error: any) {
      console.error(error);
      this.mostrarMensaje('Error al enviar el correo. Verifica que esté bien escrito.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.mostrarMensaje('Por favor, completa los campos correctamente.', 'warning');
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const { email, password } = this.loginForm.value;

    // --- NUEVA LÓGICA: Validación estricta SOLO en Registro ---
    if (this.isRegisterMode) {
      const tieneMayuscula = /[A-Z]+/.test(password);
      const tieneMinuscula = /[a-z]+/.test(password);
      const tieneNumero = /[0-9]+/.test(password);
      const longitudValida = password.length >= 8;

      if (!(tieneMayuscula && tieneMinuscula && tieneNumero && longitudValida)) {
        this.mostrarMensaje('Contraseña débil. Debe tener mínimo 8 caracteres, incluir mayúsculas, minúsculas y números.', 'warning');
        return; // Detenemos el registro si no cumple
      }
    }

    this.isLoading = true;

    try {
      if (this.isRegisterMode) {
        const isAuthorized = await this.dbService.verificarAutorizacion(email);

        if (!isAuthorized) {
          this.mostrarMensaje('Tu correo no está autorizado o tu cuenta está inactiva. Contacta al Administrador.', 'danger');
          this.isLoading = false;
          return;
        }

        await createUserWithEmailAndPassword(this.auth, email, password);
        this.mostrarMensaje('¡Cuenta creada con éxito! Bienvenido a GATI.', 'success');
        this.router.navigate(['/tabs/dashboard']);

      } else {
        const isAuthorized = await this.dbService.verificarAutorizacion(email);
        if (!isAuthorized) {
          this.mostrarMensaje('Tu cuenta ha sido desactivada por el Administrador.', 'danger');
          this.isLoading = false;
          return;
        }

        await signInWithEmailAndPassword(this.auth, email, password);
        this.router.navigate(['/tabs/dashboard']);
      }

    } catch (error: any) {
      console.error('Error de autenticación:', error);
      if (error.code === 'auth/email-already-in-use') {
        this.mostrarMensaje('Este correo ya está registrado. Por favor, Inicia Sesión.', 'warning');
      } else {
        this.mostrarMensaje('Credenciales incorrectas o error de conexión.', 'danger');
      }
    } finally {
      this.isLoading = false;
    }
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 4000,
      position: 'top',
      color: color
    });
    await toast.present();
  }
}
