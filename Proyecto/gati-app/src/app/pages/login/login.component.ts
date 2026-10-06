import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

// 1. Añadimos el ToastController a nuestras importaciones
import {
  IonContent,
  IonInput,
  IonButton,
  ToastController
} from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonInput,
    IonButton
  ]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private toastController: ToastController // 2. Inyectamos la herramienta aquí
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  async onLogin() {
    if (this.loginForm.valid) {

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const { email, password } = this.loginForm.value;

      try {
        await signInWithEmailAndPassword(this.auth, email, password);
        console.log('¡Sesión iniciada con éxito!');
        this.router.navigate(['/tabs/tab1']);
      } catch (error) {
        console.error('Error al iniciar sesión:', error);

        // 3. Creamos la notificación corporativa de error
        const toast = await this.toastController.create({
          message: 'Credenciales incorrectas o usuario inexistente.',
          duration: 3000, // Desaparece en 3 segundos
          position: 'top',
          color: 'danger' // Color rojo de Ionic
        });
        await toast.present();
      }
    }
  }
}
