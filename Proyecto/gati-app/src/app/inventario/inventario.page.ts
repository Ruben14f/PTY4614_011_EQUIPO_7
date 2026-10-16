import { Component, inject, ChangeDetectorRef } from '@angular/core'; // <-- 1. Añadimos ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';

import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent,
  IonItem, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon,
  IonGrid, IonRow, IonCol, IonSegment, IonSegmentButton, IonLabel,
  IonSearchbar, IonBadge, IonFab, IonFabButton, IonModal,
  ToastController, AlertController, ActionSheetController
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  saveOutline, hardwareChipOutline, checkmarkCircleOutline, logOutOutline,
  add, ellipsisVertical, desktopOutline, codeSlashOutline, closeOutline,
  personAddOutline, trashOutline
} from 'ionicons/icons';

import { DatabaseService } from '../services/database.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
    IonCard, IonCardContent,
    IonItem, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon,
    IonGrid, IonRow, IonCol, IonSegment, IonSegmentButton, IonLabel,
    IonSearchbar, IonBadge, IonFab, IonFabButton, IonModal
  ]
})
export class InventarioPage { // <-- 2. Quitamos OnInit, usaremos la lógica de Ionic
  isModalOpen: boolean = false;
  isSaving: boolean = false;
  equipoForm: FormGroup;

  inventarioCompleto: any[] = [];
  inventarioFiltrado: any[] = [];

  filtroCategoria: string = 'todos';
  filtroEstado: string = 'Todos';
  textoBusqueda: string = '';

  private auth = inject(Auth);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private cdr = inject(ChangeDetectorRef); // <-- 3. Inyectamos el detector de cambios

  constructor(
    private fb: FormBuilder,
    private dbService: DatabaseService,
    private toastCtrl: ToastController
  ) {
    addIcons({
      saveOutline, hardwareChipOutline, checkmarkCircleOutline, logOutOutline,
      add, ellipsisVertical, desktopOutline, codeSlashOutline, closeOutline,
      personAddOutline, trashOutline
    });

    this.equipoForm = this.fb.group({
      tipo: ['', Validators.required],
      marca: ['', Validators.required],
      modelo: ['', Validators.required],
      serie: ['', Validators.required],
      ocAsociada: ['', Validators.required],
      estado: ['En Inventario', Validators.required]
    });
  }

  // 4. NUEVO: Se ejecuta SIEMPRE que el usuario entra a esta pestaña (a diferencia de ngOnInit)
  ionViewWillEnter() {
    this.cargarInventario();
  }

  async cargarInventario() {
    const hardware = await this.dbService.obtenerTodoHardware();
    const software = await this.dbService.obtenerTodoSoftware();

const hwNormalizado = hardware.map((h: any) => ({
      ...h,
      categoria: 'Hardware',
      // Lee 'serie', y si no existe, intenta leer 'numeroSerie' (para el equipo antiguo)
      identificador: h.serie || h.numeroSerie || 'Sin Serie',
      descripcion: `${h.tipo || ''} ${h.marca || ''} ${h.modelo || ''}`,
      // Lo mismo para la OC
      ocAsociada: h.ocAsociada || h.numeroOC
    }));

    const swNormalizado = software.map((s: any) => ({
      ...s,
      categoria: 'Licencia',
      identificador: s.nombreSoftware || 'Sin ID',
      descripcion: `${s.tipoLicencia || ''} - ${s.fabricante || ''}`
    }));

    this.inventarioCompleto = [...hwNormalizado, ...swNormalizado];
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let temp = this.inventarioCompleto;

    if (this.filtroCategoria === 'hardware') {
      temp = temp.filter(item => item.categoria === 'Hardware');
    } else if (this.filtroCategoria === 'software') {
      temp = temp.filter(item => item.categoria === 'Licencia');
    }

    if (this.filtroEstado !== 'Todos') {
      temp = temp.filter(item => item.estado === this.filtroEstado);
    }

    if (this.textoBusqueda.trim() !== '') {
      const termino = this.textoBusqueda.toLowerCase();
      temp = temp.filter(item =>
        (item.identificador && item.identificador.toLowerCase().includes(termino)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(termino)) ||
        (item.asignadoA && item.asignadoA.toLowerCase().includes(termino))
      );
    }

    this.inventarioFiltrado = temp;

    // 5. NUEVO: Le avisamos a Angular explícitamente que los datos ya están listos para pintarse
    this.cdr.detectChanges();
  }

  async abrirOpciones(item: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Opciones: ${item.identificador}`,
      buttons: [
        {
          text: 'Asignar a Funcionario',
          icon: 'person-add-outline',
          handler: () => {
            this.mostrarMensaje('Función de asignación en construcción...', 'primary');
          }
        },
        {
          text: 'Dar de Baja',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.confirmarBaja(item);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async confirmarBaja(item: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Baja',
      message: `¿Estás seguro de que deseas dar de baja el activo ${item.identificador}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Dar de baja',
          handler: () => this.mostrarMensaje('Función de baja en construcción...', 'warning')
        }
      ]
    });
    await alert.present();
  }

  setModalOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (!isOpen) {
      this.equipoForm.reset({ estado: 'En Inventario' });
    }
  }

  async guardarEquipo() {
    if (this.equipoForm.invalid) {
      this.equipoForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const nuevoEquipo = this.equipoForm.value;

    try {
      await this.dbService.registrarHardware(nuevoEquipo);
      this.mostrarMensaje('Equipo registrado exitosamente.', 'success');
      this.setModalOpen(false);
      this.cargarInventario();
    } catch (error) {
      this.mostrarMensaje('Error de conexión al guardar.', 'danger');
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
            this.mostrarMensaje('Sesión cerrada.', 'success');
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      position: 'top',
      color: color
    });
    await toast.present();
  }
}
