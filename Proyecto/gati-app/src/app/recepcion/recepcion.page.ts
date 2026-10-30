import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { ApiService } from '../services/api.service';
import { DatabaseService } from '../services/database.service';

import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle,
  IonContent, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonItem, IonIcon, IonInput, IonButton, IonText,
  IonList, IonListHeader, IonLabel, IonBadge,
  ToastController, AlertController
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  searchOutline, alertCircleOutline, documentTextOutline,
  cubeOutline, qrCodeOutline, barcodeOutline,
  checkmarkCircle, alertCircle, imageOutline, logOutOutline
} from 'ionicons/icons';

import { BrowserMultiFormatReader } from '@zxing/browser';

@Component({
  selector: 'app-recepcion',
  templateUrl: './recepcion.page.html',
  styleUrls: ['./recepcion.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
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

  modoEscaneo: boolean = false;
  codigoEscaneado: string = '';
  articuloSeleccionado: any = null;

  equiposRecibidos: any[] = [];
  licenciasRecibidas: any[] = [];

  private apiService = inject(ApiService);
  private databaseService = inject(DatabaseService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(Auth);
  private router = inject(Router);

  constructor() {
    addIcons({
      searchOutline, alertCircleOutline, documentTextOutline,
      cubeOutline, qrCodeOutline, barcodeOutline,
      checkmarkCircle, alertCircle, imageOutline, logOutOutline
    });
  }

  async buscarOrden() {
    if (!this.numeroOC.trim()) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.ordenData = null;
    this.modoEscaneo = false;
    this.articuloSeleccionado = null;
    this.cdr.detectChanges();

    try {
      const ocFormateada = this.numeroOC.trim().toUpperCase();

      const dataBruta = await this.apiService.consultarOC(ocFormateada);
      this.equiposRecibidos = await this.databaseService.obtenerEquiposPorOC(ocFormateada);
      this.licenciasRecibidas = await this.databaseService.obtenerLicenciasPorOC(ocFormateada);

      const dataFresca = JSON.parse(JSON.stringify(dataBruta));

      dataFresca.articulos.forEach((articulo: any) => {
        if (articulo.tipo === 'Licencia') {
          // Para el software buscamos si el lote ya fue registrado
          const loteExiste = this.licenciasRecibidas.some((lic: any) =>
            lic.marca === articulo.marca && lic.modelo === articulo.modelo
          );
          articulo.cantidadRecibida = loteExiste ? articulo.cantidadTotal : 0;
        } else {
          // Para el hardware contamos los equipos reales ingresados
          const cantidadReal = this.equiposRecibidos.filter((eq: any) =>
            eq.tipo === articulo.tipo && eq.marca === articulo.marca && eq.modelo === articulo.modelo
          ).length;
          articulo.cantidadRecibida = cantidadReal;
        }
      });

      this.ordenData = dataFresca;

    } catch (error: any) {
      this.errorMessage = error.message;
    } finally {
      this.isLoading = false;
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 50);
    }
  }

  seleccionarArticulo(item: any) {
    if (item.cantidadRecibida >= item.cantidadTotal) {
      this.mostrarMensaje('Este artículo ya está recepcionado al 100%', 'warning');
      return;
    }
    this.articuloSeleccionado = item;
    this.modoEscaneo = true;
    this.cdr.detectChanges();
  }

  async leerImagen(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const imageUrl = URL.createObjectURL(file);
      const codeReader = new BrowserMultiFormatReader();
      const result = await codeReader.decodeFromImageUrl(imageUrl);

      this.codigoEscaneado = result.getText();
      this.mostrarMensaje('Código detectado en la imagen', 'success');
      this.procesarEscaneo();

    } catch (error) {
      this.mostrarMensaje('No se detectó ningún código de barras o QR.', 'warning');
    } finally {
      event.target.value = '';
    }
  }

  async procesarEscaneo() {
    if (!this.codigoEscaneado.trim() || !this.articuloSeleccionado) return;

    const inputData = this.codigoEscaneado.trim().toUpperCase();

    try {
      // 1. LÓGICA PARA SOFTWARE (LOTE)
      if (this.articuloSeleccionado.tipo === 'Licencia') {
        const existeContrato = await this.databaseService.verificarContratoExiste(inputData);
        if (existeContrato) {
          this.mostrarMensaje(`ALERTA: El contrato/lote ${inputData} ya existe en el sistema.`, 'danger');
          this.codigoEscaneado = '';
          return;
        }

        const nuevoLote = {
          identificador: inputData, // Ejemplo: ADOBE-2026
          categoria: 'Licencia',
          marca: this.articuloSeleccionado.marca,
          modelo: this.articuloSeleccionado.modelo,
          cantidadTotal: this.articuloSeleccionado.cantidadTotal,
          ocAsociada: this.numeroOC.toUpperCase(),
          proveedor: this.ordenData.proveedor,
          fechaSimulada: this.ordenData.fechaEmision
        };

        await this.databaseService.registrarLicenciaLote(nuevoLote);
        this.licenciasRecibidas.push(nuevoLote);
        this.articuloSeleccionado.cantidadRecibida = this.articuloSeleccionado.cantidadTotal; // Llena la barra completa
        this.mostrarMensaje(`Éxito: Lote de licencias ${this.articuloSeleccionado.marca} guardado.`, 'success');
      }

      // 2. LÓGICA PARA HARDWARE (INDIVIDUAL)
      else {
        const existeGlobal = await this.databaseService.verificarSerieExiste(inputData);
        if (existeGlobal) {
          this.mostrarMensaje(`ALERTA: La serie ${inputData} ya se encuentra registrada.`, 'danger');
          this.codigoEscaneado = '';
          return;
        }

        const nuevoEquipo = {
          serie: inputData,
          tipo: this.articuloSeleccionado.tipo,
          marca: this.articuloSeleccionado.marca,
          modelo: this.articuloSeleccionado.modelo,
          ocAsociada: this.numeroOC.toUpperCase(),
          proveedor: this.ordenData.proveedor,
          estado: 'En Inventario',
          fechaSimulada: this.ordenData.fechaEmision
        };

        await this.databaseService.registrarHardware(nuevoEquipo);
        this.equiposRecibidos.push(nuevoEquipo);
        this.articuloSeleccionado.cantidadRecibida += 1;
        this.mostrarMensaje(`Éxito: ${this.articuloSeleccionado.tipo} registrado.`, 'success');
      }

      if (this.articuloSeleccionado.cantidadRecibida >= this.articuloSeleccionado.cantidadTotal) {
        this.articuloSeleccionado = null;
        this.modoEscaneo = false;
      }

    } catch (error) {
      this.mostrarMensaje('Error al guardar en la base de datos.', 'danger');
    } finally {
      this.codigoEscaneado = '';
      setTimeout(() => { this.cdr.detectChanges(); }, 50);
    }
  }

  async confirmarSalida(): Promise<boolean> {
    if (!this.ordenData) return true;

    const faltanArticulos = this.ordenData.articulos.some(
      (a: any) => a.cantidadRecibida < a.cantidadTotal
    );

    if (!faltanArticulos) return true;

    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: '¿Salir de la Recepción?',
        message: 'Tienes una Orden en proceso. Si sales, la vista se limpiará.',
        buttons: [
          { text: 'Quedarme', role: 'cancel', handler: () => resolve(false) },
          { text: 'Sí, salir', handler: () => resolve(true) }
        ]
      });
      await alert.present();
    });
  }

  async onLogout() {
    const puedeSalir = await this.confirmarSalida();
    if (!puedeSalir) return;

    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir del sistema GATI?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, salir', handler: async () => { await signOut(this.auth); this.router.navigate(['/login']); } }
      ]
    });
    await alert.present();
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'top',
      icon: color === 'success' ? 'checkmark-circle' : 'alert-circle'
    });
    await toast.present();
  }
}
