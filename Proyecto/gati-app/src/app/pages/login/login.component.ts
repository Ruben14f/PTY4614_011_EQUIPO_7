import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

import {
  IonContent,
  IonInput,
  IonButton
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
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  async onLogin() {
    if (this.loginForm.valid) {

      // Quitamos el foco del botón para evitar advertencias de accesibilidad
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
        alert('Credenciales incorrectas o el usuario no existe. Intente nuevamente.');
      }
    }
  }
}
