import { Component, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
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
  checkmarkCircle, alertCircle, imageOutline, logOutOutline, closeCircleOutline
} from 'ionicons/icons';

// Nueva librería multiplataforma para tiempo real
import { Html5Qrcode } from 'html5-qrcode';

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
export class RecepcionPage implements OnDestroy {
  numeroOC: string = '';
  ordenData: any = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  modoEscaneo: boolean = false;
  codigoEscaneado: string = '';
  articuloSeleccionado: any = null;

  equiposRecibidos: any[] = [];
  licenciasRecibidas: any[] = [];

  // Variables del nuevo escáner
  isScanning: boolean = false;
  private html5QrCode: Html5Qrcode | null = null;

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
      checkmarkCircle, alertCircle, imageOutline, logOutOutline, closeCircleOutline
    });
  }

  ngOnDestroy() {
    this.detenerEscaner();
  }

  async buscarOrden() {
    if (!this.numeroOC.trim()) return;

    await this.detenerEscaner();
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
          const loteExiste = this.licenciasRecibidas.some((lic: any) =>
            lic.marca === articulo.marca && lic.modelo === articulo.modelo
          );
          articulo.cantidadRecibida = loteExiste ? articulo.cantidadTotal : 0;
        } else {
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
      setTimeout(() => { this.cdr.detectChanges(); }, 50);
    }
  }

  async seleccionarArticulo(item: any) {
    if (item.cantidadRecibida >= item.cantidadTotal) {
      this.mostrarMensaje('Este artículo ya está recepcionado al 100%', 'warning');
      return;
    }
    await this.detenerEscaner();
    this.articuloSeleccionado = item;
    this.modoEscaneo = true;
    this.cdr.detectChanges();
  }

  // --- NUEVA LÓGICA DE ESCÁNER EN TIEMPO REAL ---
  async iniciarEscaner() {
    this.isScanning = true;
    this.cdr.detectChanges();

    // Pequeña pausa para asegurar que el div "reader" ya existe en el HTML
    setTimeout(async () => {
      try {
        this.html5QrCode = new Html5Qrcode("reader");
        await this.html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // Éxito al leer
            this.codigoEscaneado = decodedText;
            this.detenerEscaner();
            this.mostrarMensaje('Código detectado', 'success');
            this.procesarEscaneo();
          },
          (errorMessage) => {
            // Ignoramos los errores continuos de búsqueda de frames
          }
        );
      } catch (err) {
        console.error("Error al iniciar cámara", err);
        this.mostrarMensaje('No se pudo acceder a la cámara. Revisa los permisos.', 'danger');
        this.isScanning = false;
        this.cdr.detectChanges();
      }
    }, 150);
  }

  async detenerEscaner() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (err) {
        console.error("Error al detener el escáner", err);
      }
    }
    this.isScanning = false;
    this.cdr.detectChanges();
  }
  // ----------------------------------------------

  async procesarEscaneo() {
    if (!this.codigoEscaneado.trim() || !this.articuloSeleccionado) return;

    const inputData = this.codigoEscaneado.trim().toUpperCase();

    try {
      if (this.articuloSeleccionado.tipo === 'Licencia') {
        const existeContrato = await this.databaseService.verificarContratoExiste(inputData);
        if (existeContrato) {
          this.mostrarMensaje(`ALERTA: El contrato/lote ${inputData} ya existe en el sistema.`, 'danger');
          this.codigoEscaneado = '';
          return;
        }

        const nuevoLote = {
          identificador: inputData,
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
        this.articuloSeleccionado.cantidadRecibida = this.articuloSeleccionado.cantidadTotal;
        this.mostrarMensaje(`Éxito: Lote de licencias ${this.articuloSeleccionado.marca} guardado.`, 'success');
      }
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
          { text: 'Sí, salir', handler: () => { this.detenerEscaner(); resolve(true); } }
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
        { text: 'Sí, salir', handler: async () => { await this.detenerEscaner(); await signOut(this.auth); this.router.navigate(['/login']); } }
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
