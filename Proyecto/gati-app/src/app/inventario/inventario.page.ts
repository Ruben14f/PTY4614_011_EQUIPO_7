import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';

import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonCardTitle,
  IonItem, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon,
  IonGrid, IonRow, IonCol, IonSegment, IonSegmentButton, IonLabel,
  IonSearchbar, IonBadge, IonFab, IonFabButton, IonModal,
  ToastController, AlertController, ActionSheetController
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  saveOutline, hardwareChipOutline, checkmarkCircleOutline, logOutOutline,
  add, ellipsisVertical, desktopOutline, codeSlashOutline, closeOutline,
  personAddOutline, trashOutline, returnDownBackOutline
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
    IonCard, IonCardContent, IonCardTitle,
    IonItem, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon,
    IonGrid, IonRow, IonCol, IonSegment, IonSegmentButton, IonLabel,
    IonSearchbar, IonBadge, IonFab, IonFabButton, IonModal
  ]
})
export class InventarioPage {
  isModalOpen: boolean = false;
  isSaving: boolean = false;
  equipoForm: FormGroup;

  // --- VARIABLES DE ASIGNACIÓN UNIVERSAL MEJORADA ---
  funcionarios: any[] = [];
  areas: string[] = []; // Lista de áreas únicas
  areaSeleccionada: string = '';
  funcionariosFiltrados: any[] = []; // Los que pertenecen al área seleccionada
  isAsignarModalOpen: boolean = false;
  equipoSeleccionado: any = null;
  funcionarioSeleccionado: any = null;

  inventarioCompleto: any[] = [];
  inventarioFiltrado: any[] = [];
  filtroCategoria: string = 'todos';
  filtroEstado: string = 'Todos';
  textoBusqueda: string = '';

  private auth = inject(Auth);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private dbService: DatabaseService,
    private toastCtrl: ToastController
  ) {
    addIcons({
      saveOutline, hardwareChipOutline, checkmarkCircleOutline, logOutOutline,
      add, ellipsisVertical, desktopOutline, codeSlashOutline, closeOutline,
      personAddOutline, trashOutline, returnDownBackOutline
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

  async ionViewWillEnter() {
    this.cargarInventario();
    this.funcionarios = await this.dbService.obtenerFuncionarios();

    // Extraemos las Áreas únicas para el primer selector
    const areasSet = new Set(this.funcionarios.map(f => f.area).filter(a => a));
    this.areas = Array.from(areasSet);
  }

  async cargarInventario() {
    const hardware = await this.dbService.obtenerTodoHardware();
    const software = await this.dbService.obtenerTodoSoftware();

    const hwNormalizado = hardware.map((h: any) => ({
      ...h,
      categoria: 'Hardware',
      identificador: h.serie || h.numeroSerie || 'Sin Serie',
      descripcion: `${h.tipo || ''} ${h.marca || ''} ${h.modelo || ''}`,
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

    if (this.filtroCategoria === 'hardware') temp = temp.filter(item => item.categoria === 'Hardware');
    else if (this.filtroCategoria === 'software') temp = temp.filter(item => item.categoria === 'Licencia');

    if (this.filtroEstado !== 'Todos') temp = temp.filter(item => item.estado === this.filtroEstado);

    if (this.textoBusqueda.trim() !== '') {
      const termino = this.textoBusqueda.toLowerCase();
      temp = temp.filter(item =>
        (item.identificador && item.identificador.toLowerCase().includes(termino)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(termino)) ||
        (item.asignadoA_nombre && item.asignadoA_nombre.toLowerCase().includes(termino)) ||
        (item.asignadoA && item.asignadoA.toLowerCase().includes(termino))
      );
    }

    this.inventarioFiltrado = temp;
    this.cdr.detectChanges();
  }

async abrirOpciones(item: any) {
    // 1. Empezamos con un arreglo vacío de botones
    const botones = [];

    // 2. Si está en bodega, podemos ASIGNARLO
    if (item.estado === 'En Inventario') {
      botones.push({
        text: 'Asignar a Funcionario',
        icon: 'person-add-outline',
        handler: () => {
          setTimeout(() => this.abrirModalAsignar(item), 150);
        }
      });
    }

    // 3. Si está asignado, podemos DESVINCULARLO
    if (item.estado === 'Asignado') {
      botones.push({
        text: 'Desvincular (Devolver a bodega)',
        icon: 'return-down-back-outline',
        handler: () => this.confirmarDesvinculacion(item)
      });
    }

    // 4. Mientras NO esté ya de baja, siempre podemos DARLO DE BAJA (se puede dañar en bodega o en uso)
    if (item.estado !== 'De Baja') {
      botones.push({
        text: 'Dar de Baja (Retirar)',
        icon: 'trash-outline',
        role: 'destructive',
        handler: () => this.confirmarBaja(item)
      });
    }

    // 5. El botón de cancelar siempre va al final
    botones.push({
      text: 'Cancelar',
      icon: 'close-outline',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: `Opciones: ${item.identificador}`,
      buttons: botones
    });
    await actionSheet.present();
  }

  async confirmarDesvinculacion(item: any) {
    const alert = await this.alertController.create({
      header: 'Devolver a Inventario',
      message: `¿Estás seguro de que deseas quitarle el activo a <strong>${item.asignadoA_nombre}</strong> y devolverlo a bodega?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Desvincular',
          handler: async () => {
            const coleccion = item.categoria === 'Hardware' ? 'hardware' : 'software';
            await this.dbService.desvincularActivo(coleccion, item.id);
            this.mostrarMensaje('Equipo devuelto a bodega exitosamente', 'success');
            this.cargarInventario(); // Refrescamos la tabla
          }
        }
      ]
    });
    await alert.present();
  }

  // --- LÓGICA DE ASIGNACIÓN UNIVERSAL MEJORADA ---
  abrirModalAsignar(equipo: any) {
    this.equipoSeleccionado = equipo;
    this.areaSeleccionada = '';
    this.funcionarioSeleccionado = null;
    this.funcionariosFiltrados = [];
    this.isAsignarModalOpen = true;
    this.cdr.detectChanges(); // Forzamos actualización visual
  }

  alSeleccionarArea() {
    this.funcionarioSeleccionado = null; // Limpiamos al cambiar de área
    // Filtramos los funcionarios que pertenezcan al área seleccionada
    this.funcionariosFiltrados = this.funcionarios.filter(f => f.area === this.areaSeleccionada);
  }

  cerrarModalAsignar() {
    this.isAsignarModalOpen = false;
    this.equipoSeleccionado = null;
    this.areaSeleccionada = '';
    this.funcionarioSeleccionado = null;
  }

  async guardarAsignacion() {
    if (!this.funcionarioSeleccionado) {
      this.mostrarMensaje('Seleccione un funcionario', 'warning');
      return;
    }

    try {
      const coleccion = this.equipoSeleccionado.categoria === 'Hardware' ? 'hardware' : 'software';

      // SOLUCIÓN: Respaldamos por si la variable original se llamaba "nombres"
      const funcionarioAjustado = {
        ...this.funcionarioSeleccionado,
        nombre: this.funcionarioSeleccionado.nombreCompleto || 'Sin Nombre'
      };

      await this.dbService.asignarActivo(coleccion, this.equipoSeleccionado.id, funcionarioAjustado);

      this.cerrarModalAsignar();
      this.mostrarMensaje('Activo asignado exitosamente', 'success');
      this.cargarInventario(); // Refresca la tabla automáticamente

    } catch (error) {
      this.mostrarMensaje('Error al asignar el activo', 'danger');
      console.error(error);
    }
  }

  // ... (Las funciones confirmarBaja, setModalOpen, guardarEquipo, onLogout y mostrarMensaje quedan igual hacia abajo)
async confirmarBaja(item: any) {
    const alert = await this.alertController.create({
      header: 'Dar de Baja',
      message: 'Indique el motivo técnico por el cual este activo sale de circulación:',
      inputs: [
        { type: 'radio', label: 'Falla Irreparable', value: 'Falla Irreparable' },
        { type: 'radio', label: 'Obsolescencia Técnica', value: 'Obsolescencia Técnica' },
        { type: 'radio', label: 'Robo o Pérdida', value: 'Robo o Pérdida' },
        { type: 'radio', label: 'Término de Vida Útil', value: 'Término de Vida Útil' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar Baja',
          role: 'destructive',
          handler: async (motivoSeleccionado) => {
            if (!motivoSeleccionado) {
              this.mostrarMensaje('Debe seleccionar un motivo para auditoría', 'warning');
              return false; // Evita que se cierre la alerta si no eligió nada
            }

            const coleccion = item.categoria === 'Hardware' ? 'hardware' : 'software';
            await this.dbService.darDeBajaActivo(coleccion, item.id, motivoSeleccionado);
            this.mostrarMensaje('Activo dado de baja correctamente', 'success');
            this.cargarInventario();
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  setModalOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (!isOpen) this.equipoForm.reset({ estado: 'En Inventario' });
  }

  async guardarEquipo() {
    if (this.equipoForm.invalid) return this.equipoForm.markAllAsTouched();
    this.isSaving = true;
    try {
      await this.dbService.registrarHardware(this.equipoForm.value);
      this.mostrarMensaje('Equipo registrado exitosamente.', 'success');
      this.setModalOpen(false);
      this.cargarInventario();
    } catch (error) {
      this.mostrarMensaje('Error al guardar.', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async onLogout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Deseas salir del sistema?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, salir', handler: async () => { await signOut(this.auth); this.router.navigate(['/login']); } }
      ]
    });
    await alert.present();
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500, position: 'top', color: color });
    await toast.present();
  }
}
