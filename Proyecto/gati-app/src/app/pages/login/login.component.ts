import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';


// 1. Añadimos createUserWithEmailAndPassword para el registro
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from '@angular/fire/auth';
import { IonContent, IonInput, IonButton, ToastController } from '@ionic/angular';

// 2. Importamos tu servicio de base de datos
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
  isRegisterMode: boolean = false; // Controla si estamos en Login o en Registro
  isLoading: boolean = false;      // Evita doble clic mientras carga

  private dbService = inject(DatabaseService);

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private toastController: ToastController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  // Alterna entre Iniciar Sesión y Registrarse
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
    if (this.loginForm.invalid) return;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const { email, password } = this.loginForm.value;
    this.isLoading = true;

    try {
      if (this.isRegisterMode) {
        // --- FLUJO DE REGISTRO VALIDADO ---

        // 1. Verificamos si el admin lo autorizó en Firestore
        const isAuthorized = await this.dbService.verificarAutorizacion(email);

        if (!isAuthorized) {
          this.mostrarMensaje('Tu correo no está autorizado. Contacta al Administrador.', 'warning');
          this.isLoading = false;
          return; // Detenemos el proceso aquí
        }

        // 2. Si está autorizado, creamos su cuenta en Firebase Auth
        await createUserWithEmailAndPassword(this.auth, email, password);
        this.mostrarMensaje('¡Cuenta creada con éxito! Bienvenido a GATI.', 'success');
        this.router.navigate(['/tabs/tab1']);

      } else {
        // --- FLUJO DE LOGIN NORMAL ---
        await signInWithEmailAndPassword(this.auth, email, password);
        this.router.navigate(['/tabs/tab1']);
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
      duration: 3500,
      position: 'top',
      color: color
    });
    await toast.present();
  }
}
