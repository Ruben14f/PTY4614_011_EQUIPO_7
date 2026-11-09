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
  ToastController, AlertController, ActionSheetController,
  IonList, IonSpinner, IonFooter
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  saveOutline, hardwareChipOutline, checkmarkCircle, checkmarkCircleOutline, logOutOutline,
  add, ellipsisVertical, desktopOutline, codeSlashOutline, closeOutline,
  personAddOutline, trashOutline, returnDownBackOutline, timeOutline, calendarOutline, warningOutline,
  cameraOutline, documentTextOutline, peopleOutline, personCircleOutline, closeCircleOutline
} from 'ionicons/icons';

import { DatabaseService } from '../services/database.service';
import { jsPDF } from 'jspdf';

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
    IonSearchbar, IonBadge, IonFab, IonFabButton, IonModal,
    IonList, IonSpinner, IonFooter
  ]
})
export class InventarioPage {
  isModalOpen: boolean = false;
  isSaving: boolean = false;
  equipoForm: FormGroup;

  funcionarios: any[] = [];
  areas: string[] = [];
  areaSeleccionada: string = '';
  funcionariosFiltrados: any[] = [];

  isAsignarModalOpen: boolean = false;
  equipoSeleccionado: any = null;
  funcionarioSeleccionado: any = null;
  isDevolverModalOpen: boolean = false;
  equipoParaDevolver: any = null;

  isAsignarLicenciaModalOpen: boolean = false;
  isVerAsignadosModalOpen: boolean = false;
  licenciaParaVer: any = null;

  // Filtro específico para el modal de usuarios
  textoBusquedaModal: string = '';
  usuariosAsignadosFiltrados: any[] = [];

  inventarioCompleto: any[] = [];
  inventarioFiltrado: any[] = [];
  filtroCategoria: string = 'todos';
  filtroEstado: string[] = ['Todos'];
  textoBusqueda: string = '';

  isHistorialModalOpen: boolean = false;
  historialActivo: any[] = [];
  equipoParaHistorial: any = null;
  mensajeObsolescencia: string = '';
  colorObsolescencia: string = 'success';

  private auth = inject(Auth);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private dbService = inject(DatabaseService);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({
      saveOutline, hardwareChipOutline, checkmarkCircle, checkmarkCircleOutline, logOutOutline,
      add, ellipsisVertical, desktopOutline, codeSlashOutline, closeOutline,
      personAddOutline, trashOutline, returnDownBackOutline, timeOutline, calendarOutline, warningOutline,
      cameraOutline, documentTextOutline, peopleOutline, personCircleOutline, closeCircleOutline
    });

    this.equipoForm = this.fb.group({
      tipo: ['Notebook', Validators.required],
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
    const areasSet = new Set(this.funcionarios.map(f => f.area).filter(a => a));
    this.areas = Array.from(areasSet);
  }

  async cargarInventario() {
    const hardware = await this.dbService.obtenerTodoHardware();
    const software = await this.dbService.obtenerTodoSoftware();
    const hoy = new Date();

    const hwNormalizado = hardware.map((h: any) => ({
      ...h,
      categoria: 'Hardware',
      identificador: h.serie || h.numeroSerie || 'Sin Serie',
      descripcion: `${h.tipo || ''} ${h.marca || ''} ${h.modelo || ''}`,
      ocAsociada: h.ocAsociada || h.numeroOC
    }));

    const swNormalizado = software.map((s: any) => {
      let fechaVence = null;
      let estaVencida = false;

      if (s.fechaIngreso) {
        const fIngreso = s.fechaIngreso.toDate ? s.fechaIngreso.toDate() : new Date(s.fechaIngreso);
        fechaVence = new Date(fIngreso);
        fechaVence.setFullYear(fechaVence.getFullYear() + 1);
        estaVencida = fechaVence < hoy;
      }

      return {
        ...s,
        categoria: 'Licencia',
        identificador: s.identificador || s.modelo || s.nombreSoftware || 'Software',
        descripcion: `${s.marca || 'N/A'}`,
        cantidadTotal: s.cantidadTotal || 0,
        cantidadDisponible: s.cantidadDisponible !== undefined ? s.cantidadDisponible : (s.cantidadTotal || 0),
        asignados: s.asignados || [],
        fechaVencimientoCalculada: fechaVence,
        estaVencida: estaVencida,
        ocAsociada: s.ocAsociada || s.numeroOC
      };
    });

    this.inventarioCompleto = [...hwNormalizado, ...swNormalizado];
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let temp = this.inventarioCompleto;
    if (this.filtroCategoria === 'hardware') temp = temp.filter(item => item.categoria === 'Hardware');
    else if (this.filtroCategoria === 'software') temp = temp.filter(item => item.categoria === 'Licencia');

    if (this.filtroEstado && this.filtroEstado.length > 0 && !this.filtroEstado.includes('Todos')) {
      temp = temp.filter(item => {
        if (item.categoria === 'Hardware') return this.filtroEstado.includes(item.estado);
        if (this.filtroEstado.includes('De Baja') && item.estaVencida) return true;
        if (this.filtroEstado.includes('En Inventario') && item.cantidadDisponible > 0 && !item.estaVencida) return true;
        if (this.filtroEstado.includes('Asignado') && item.cantidadDisponible === 0 && !item.estaVencida) return true;
        return false;
      });
    }

    if (this.textoBusqueda.trim() !== '') {
      const termino = this.textoBusqueda.toLowerCase();
      temp = temp.filter(item =>
        (item.identificador && item.identificador.toLowerCase().includes(termino)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(termino))
      );
    }
    this.inventarioFiltrado = temp;
    this.cdr.detectChanges();
  }

  async abrirOpciones(item: any) {
    const botones = [];

    if (item.categoria === 'Hardware') {
      if (item.estado === 'En Inventario') {
        botones.push({ text: 'Asignar a Funcionario', icon: 'person-add-outline', data: 'asignar' });
      }
      if (item.estado === 'Asignado') {
        botones.push({ text: 'Desvincular (Devolver)', icon: 'return-down-back-outline', data: 'devolver' });
      }
      if (item.estado !== 'De Baja') {
        botones.push({ text: 'Dar de Baja (Retirar)', icon: 'trash-outline', role: 'destructive', data: 'baja' });
      }
    } else {
      if (item.cantidadDisponible > 0 && !item.estaVencida) {
        botones.push({ text: 'Asignar Licencia', icon: 'person-add-outline', data: 'asignarLicencia' });
      }
      botones.push({ text: 'Ver Personal Asignado', icon: 'people-outline', data: 'verAsignados' });
    }

    botones.push({ text: 'Ver Historial', icon: 'time-outline', data: 'historial' });
    botones.push({ text: 'Cancelar', icon: 'close-outline', role: 'cancel' });

    const actionSheet = await this.actionSheetCtrl.create({ header: `Opciones: ${item.identificador}`, buttons: botones });
    await actionSheet.present();

    const { data } = await actionSheet.onDidDismiss();

    if (data) {
      if (data === 'asignar') this.abrirModalAsignar(item);
      else if (data === 'devolver') this.abrirModalDevolver(item);
      else if (data === 'baja') this.confirmarBaja(item);
      else if (data === 'asignarLicencia') this.abrirModalAsignarLicencia(item);
      else if (data === 'verAsignados') this.abrirModalVerAsignados(item);
      else if (data === 'historial') this.abrirModalHistorial(item);
    }
  }

  alSeleccionarArea() {
    this.funcionarioSeleccionado = null;
    this.funcionariosFiltrados = this.funcionarios.filter(f => f.area === this.areaSeleccionada);
  }

  cerrarModalAsignar() {
    this.isAsignarModalOpen = false;
    this.equipoSeleccionado = null;
    this.areaSeleccionada = '';
    this.funcionarioSeleccionado = null;
    this.isSaving = false;
  }

  abrirModalAsignar(equipo: any) {
    this.equipoSeleccionado = equipo;
    this.areaSeleccionada = '';
    this.funcionarioSeleccionado = null;
    this.funcionariosFiltrados = [];
    this.calcularObsolescencia(equipo);
    this.isAsignarModalOpen = true;
    this.cdr.detectChanges();
  }

  abrirModalDevolver(item: any) {
    this.equipoParaDevolver = item;
    this.isDevolverModalOpen = true;
    this.cdr.detectChanges();
  }

  cerrarModalDevolver() {
    this.isDevolverModalOpen = false;
    this.equipoParaDevolver = null;
    this.isSaving = false;
  }

  abrirModalAsignarLicencia(item: any) {
    this.equipoSeleccionado = item;
    this.areaSeleccionada = '';
    this.funcionarioSeleccionado = null;
    this.funcionariosFiltrados = [];
    this.calcularObsolescencia(item);
    this.isAsignarLicenciaModalOpen = true;
    this.cdr.detectChanges();
  }

  cerrarModalAsignarLicencia() {
    this.isAsignarLicenciaModalOpen = false;
    this.equipoSeleccionado = null;
    this.funcionarioSeleccionado = null;
    this.isSaving = false;
  }

  abrirModalVerAsignados(item: any) {
    this.licenciaParaVer = item;
    this.textoBusquedaModal = '';
    this.usuariosAsignadosFiltrados = [...(item.asignados || [])];
    this.isVerAsignadosModalOpen = true;
    this.cdr.detectChanges();
  }

  filtrarUsuariosModal() {
    if (!this.textoBusquedaModal.trim()) {
      this.usuariosAsignadosFiltrados = [...(this.licenciaParaVer.asignados || [])];
      return;
    }
    const termino = this.textoBusquedaModal.toLowerCase();
    this.usuariosAsignadosFiltrados = (this.licenciaParaVer.asignados || []).filter((u: any) =>
      (u.nombre || u.nombreCompleto || '').toLowerCase().includes(termino) ||
      (u.rut || '').toLowerCase().includes(termino) ||
      (u.area || '').toLowerCase().includes(termino)
    );
  }

  cerrarModalVerAsignados() {
    this.isVerAsignadosModalOpen = false;
    this.licenciaParaVer = null;
  }

  async procesarAsignacionLicencia() {
    if (!this.funcionarioSeleccionado) return;
    this.isSaving = true;

    try {
      const destino = {
        nombre: this.funcionarioSeleccionado.nombreCompleto || 'Sin Nombre',
        rut: this.funcionarioSeleccionado.rut || '',
        area: this.funcionarioSeleccionado.area || 'Sin Área'
      };

      await this.dbService.asignarLicencia(this.equipoSeleccionado.id, destino);
      this.mostrarMensaje('Licencia asignada correctamente', 'success');
      this.cerrarModalAsignarLicencia();
      this.cargarInventario();
    } catch (error) {
      this.mostrarMensaje('Error al asignar licencia', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async desvincularLicenciaUsuario(persona: any) {
    this.isSaving = true;
    try {
      await this.dbService.desvincularLicencia(this.licenciaParaVer.id, persona);
      this.licenciaParaVer.asignados = this.licenciaParaVer.asignados.filter((p: any) => p.rut !== persona.rut);
      this.licenciaParaVer.cantidadDisponible++;

      this.filtrarUsuariosModal();

      this.mostrarMensaje('Licencia devuelta al pozo de disponibles', 'success');
      this.cargarInventario();
    } catch (error) {
      this.mostrarMensaje('Error al quitar licencia', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async formatearImagenParaPDF(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = error => reject(error);
      reader.onload = (event: any) => {
        const img = new Image();
        img.onerror = error => reject(error);
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const maxAncho = 800;
            const escala = Math.min(maxAncho / img.width, 1);
            canvas.width = img.width * escala;
            canvas.height = img.height * escala;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } catch (e) {
            reject(e);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async procesarFotoCedula(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      this.mostrarMensaje('Generando acta, por favor espera...', 'warning');
      const base64Image = await this.formatearImagenParaPDF(file);

      const nombreFuncionario = this.funcionarioSeleccionado.nombreCompleto || 'Sin Nombre';
      const areaFuncionario = this.funcionarioSeleccionado.area || 'Sin Área';

      const doc = new jsPDF();
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text('ACTA DE ENTREGA DE EQUIPAMIENTO - GATI', 105, 20, { align: 'center' });

      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 35);

      const textoDeclaracion = `Yo, ${nombreFuncionario}, del departamento de ${areaFuncionario}, por medio de la imagen de mi cédula de identidad adjunta en este documento, certifico haber recibido conforme el siguiente equipamiento informático:`;
      const lineasTexto = doc.splitTextToSize(textoDeclaracion, 170);
      doc.text(lineasTexto, 20, 45);

      let yPos = 45 + (lineasTexto.length * 7) + 5;

      doc.setFont("helvetica", "bold"); doc.text(`- Tipo de Activo:`, 25, yPos);
      doc.setFont("helvetica", "normal"); doc.text(`${this.equipoSeleccionado.tipo || this.equipoSeleccionado.categoria}`, 65, yPos); yPos += 7;
      doc.setFont("helvetica", "bold"); doc.text(`- Marca:`, 25, yPos);
      doc.setFont("helvetica", "normal"); doc.text(`${this.equipoSeleccionado.marca || 'N/A'}`, 45, yPos); yPos += 7;
      doc.setFont("helvetica", "bold"); doc.text(`- Modelo:`, 25, yPos);
      doc.setFont("helvetica", "normal"); doc.text(`${this.equipoSeleccionado.modelo || 'N/A'}`, 48, yPos); yPos += 7;
      doc.setFont("helvetica", "bold"); doc.text(`- Serie / ID:`, 25, yPos);
      doc.setFont("helvetica", "normal"); doc.text(`${this.equipoSeleccionado.identificador}`, 52, yPos); yPos += 15;
      doc.setFont("helvetica", "bold"); doc.text('Cédula de Identidad del Receptor:', 20, yPos); yPos += 5;

      doc.addImage(base64Image, 'JPEG', 45, yPos, 120, 80);

      const nombreArchivo = `${this.equipoSeleccionado.identificador}_${Date.now()}.pdf`;
      doc.save(nombreArchivo);

      const dataUrl = doc.output('datauristring');
      const pdfBase64 = dataUrl.split(',')[1];

      const actaUrl = await this.dbService.subirActaPDF(pdfBase64, nombreArchivo);
      const destinoGATI = { nombre: nombreFuncionario, area: areaFuncionario, rut: this.funcionarioSeleccionado.rut || '' };
      await this.dbService.asignarActivo('hardware', this.equipoSeleccionado.id, destinoGATI, actaUrl);

      this.cerrarModalAsignar();
      this.mostrarMensaje('Acta generada y guardada exitosamente', 'success');
      this.cargarInventario();

    } catch (error: any) {
      this.mostrarMensaje('Ocurrió un error: ' + (error?.message || 'Desconocido'), 'danger');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
      if(event.target) event.target.value = '';
    }
  }

  async procesarFotoDevolucion(event: any) {
    const file = event.target.files[0];
    if (!file || !this.equipoParaDevolver) return;

    const item = this.equipoParaDevolver;
    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      this.mostrarMensaje('Generando acta de devolución...', 'warning');
      const base64Image = await this.formatearImagenParaPDF(file);

      const nombreFuncionario = item.asignadoA_nombre || 'Sin Nombre';
      const areaFuncionario = item.asignadoA_area || 'Sin Área';

      const doc = new jsPDF();
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text('ACTA DE DEVOLUCIÓN DE EQUIPAMIENTO - GATI', 105, 20, { align: 'center' });

      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 35);

      const textoDeclaracion = `Yo, ${nombreFuncionario}, del departamento de ${areaFuncionario}, por medio de la imagen de mi cédula de identidad adjunta en este documento, certifico haber devuelto a bodega en las condiciones actuales el siguiente equipamiento informático:`;
      const lineasTexto = doc.splitTextToSize(textoDeclaracion, 170);
      doc.text(lineasTexto, 20, 45);

      let yPos = 45 + (lineasTexto.length * 7) + 5;

      doc.setFont("helvetica", "bold"); doc.text(`- Tipo de Activo:`, 25, yPos);
      doc.setFont("helvetica", "normal"); doc.text(`${item.tipo || item.categoria}`, 65, yPos); yPos += 7;
      doc.setFont("helvetica", "bold"); doc.text(`- Marca:`, 25, yPos);
      doc.setFont("helvetica", "normal"); doc.text(`${item.marca || 'N/A'}`, 45, yPos); yPos += 7;
      doc.setFont("helvetica", "bold"); doc.text(`- Modelo:`, 25, yPos);
      doc.setFont("helvetica", "normal"); doc.text(`${item.modelo || 'N/A'}`, 48, yPos); yPos += 7;
      doc.setFont("helvetica", "bold"); doc.text(`- Serie / ID:`, 25, yPos);
      doc.setFont("helvetica", "normal"); doc.text(`${item.identificador}`, 52, yPos); yPos += 15;
      doc.setFont("helvetica", "bold"); doc.text('Cédula de Identidad de quien entrega:', 20, yPos); yPos += 5;

      doc.addImage(base64Image, 'JPEG', 45, yPos, 120, 80);

      const nombreArchivo = `DEVOLUCION_${item.identificador}_${Date.now()}.pdf`;
      doc.save(nombreArchivo);

      const dataUrl = doc.output('datauristring');
      const pdfBase64 = dataUrl.split(',')[1];

      const actaUrl = await this.dbService.subirActaPDF(pdfBase64, nombreArchivo);
      await this.dbService.desvincularActivo('hardware', item.id, nombreFuncionario, areaFuncionario, actaUrl);

      this.cerrarModalDevolver();
      this.mostrarMensaje('Equipo devuelto y acta guardada exitosamente', 'success');
      this.cargarInventario();

    } catch (error: any) {
      this.mostrarMensaje('Error en la devolución: ' + (error?.message || 'Desconocido'), 'danger');
    } finally {
      this.isSaving = false;
      this.equipoParaDevolver = null;
      this.cdr.detectChanges();
      if(event.target) event.target.value = '';
    }
  }

  async confirmarBaja(item: any) {
    const alert = await this.alertController.create({
      header: 'Dar de Baja',
      message: 'Indique el motivo técnico por el cual este activo sale de circulación:',
      inputs: [
        { type: 'radio', label: 'Falla Irreparable', value: 'Falla Irreparable' },
        { type: 'radio', label: 'Obsolescencia Técnica', value: 'Obsolescencia Técnica' },
        { type: 'radio', label: 'Robo o Pérdida', value: 'Robo o Pérdida' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar Baja', role: 'destructive', handler: async (motivo) => {
            if (!motivo) return false;
            await this.dbService.darDeBajaActivo('hardware', item.id, motivo);
            this.mostrarMensaje('Activo dado de baja correctamente', 'success');
            this.cargarInventario();
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  calcularObsolescencia(equipo: any) {
    if (!equipo.fechaIngreso) return;

    let fechaBase = equipo.fechaIngreso.toDate ? equipo.fechaIngreso.toDate() : new Date(equipo.fechaIngreso);
    const fechaMuerte = new Date(fechaBase);
    const hoy = new Date();

    if (equipo.categoria === 'Licencia') {
      fechaMuerte.setFullYear(fechaMuerte.getFullYear() + 1);
      const diasRestantes = Math.ceil((fechaMuerte.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      if (diasRestantes <= 0) {
        this.mensajeObsolescencia = 'ALERTA: El contrato de este software ha caducado.';
        this.colorObsolescencia = 'danger';
      }
      else if (diasRestantes <= 30) {
        this.mensajeObsolescencia = `Atención: El contrato debe renovarse en ${diasRestantes} días.`;
        this.colorObsolescencia = 'warning';
      }
      else {
        this.mensajeObsolescencia = `Contrato anual vigente (Vence en ${diasRestantes} días).`;
        this.colorObsolescencia = 'success';
      }
    } else {
      fechaMuerte.setFullYear(fechaMuerte.getFullYear() + 6);
      const mesesRestantes = (fechaMuerte.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

      if (mesesRestantes <= 0) { this.mensajeObsolescencia = 'ALERTA: Equipo obsoleto (Superó 6 años).'; this.colorObsolescencia = 'danger'; }
      else if (mesesRestantes <= 12) { this.mensajeObsolescencia = `Quedan ${Math.floor(mesesRestantes)} meses de vida útil.`; this.colorObsolescencia = 'warning'; }
      else { this.mensajeObsolescencia = `Vida útil restante: ${Math.floor(mesesRestantes / 12)} años.`; this.colorObsolescencia = 'success'; }
    }
  }

  async abrirModalHistorial(equipo: any) {
    this.equipoParaHistorial = equipo;
    const coleccion = equipo.categoria === 'Hardware' ? 'hardware' : 'licencias_software';
    this.historialActivo = await this.dbService.obtenerHistorialActivo(coleccion, equipo.id);
    this.isHistorialModalOpen = true;
    this.cdr.detectChanges();
  }

  cerrarModalHistorial() {
    this.isHistorialModalOpen = false;
    this.equipoParaHistorial = null;
    this.historialActivo = [];
  }

  setModalOpen(isOpen: boolean) { this.isModalOpen = isOpen; }
  async onLogout() { await signOut(this.auth); this.router.navigate(['/login']); }
  async mostrarMensaje(mensaje: string, color: string) { const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500, position: 'top', color: color }); await toast.present(); }
  guardarEquipo() {}
}
