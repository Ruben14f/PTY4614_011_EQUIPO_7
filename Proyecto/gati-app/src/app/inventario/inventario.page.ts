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
  cameraOutline, documentTextOutline
} from 'ionicons/icons';

import { DatabaseService } from '../services/database.service';

// Importamos jsPDF en lugar de pdfmake
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

  // Variables agregadas para el Modal de Devolución
  isDevolverModalOpen: boolean = false;
  equipoParaDevolver: any = null;

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

  // Inyecciones modernas para limpiar las advertencias de ESLint
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
      cameraOutline, documentTextOutline
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
      descripcion: `${s.tipoLicencia || ''} ${s.fabricante || ''}`
    }));

    this.inventarioCompleto = [...hwNormalizado, ...swNormalizado];
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let temp = this.inventarioCompleto;
    if (this.filtroCategoria === 'hardware') temp = temp.filter(item => item.categoria === 'Hardware');
    else if (this.filtroCategoria === 'software') temp = temp.filter(item => item.categoria === 'Licencia');

    if (this.filtroEstado && this.filtroEstado.length > 0 && !this.filtroEstado.includes('Todos')) {
      temp = temp.filter(item => this.filtroEstado.includes(item.estado));
    }

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
    const botones = [];
    if (item.estado === 'En Inventario') {
      botones.push({ text: 'Asignar a Funcionario', icon: 'person-add-outline', handler: () => { setTimeout(() => this.abrirModalAsignar(item), 150); } });
    }
    if (item.estado === 'Asignado') {
      // AQUÍ SE ABRE EL MODAL DE DEVOLUCIÓN EN VEZ DE LA ALERTA
      botones.push({ text: 'Desvincular (Devolver a bodega)', icon: 'return-down-back-outline', handler: () => { this.abrirModalDevolver(item); } });
    }
    if (item.estado !== 'De Baja') {
      botones.push({ text: 'Dar de Baja (Retirar)', icon: 'trash-outline', role: 'destructive', handler: () => this.confirmarBaja(item) });
    }
    botones.push({ text: 'Ver Historial de Asignaciones', icon: 'time-outline', handler: () => { setTimeout(() => this.abrirModalHistorial(item), 150); } });
    botones.push({ text: 'Cancelar', icon: 'close-outline', role: 'cancel' });

    const actionSheet = await this.actionSheetCtrl.create({ header: `Opciones: ${item.identificador}`, buttons: botones });
    await actionSheet.present();
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

  // --- LÓGICA CON JSPDF (SÍNCRONA, RÁPIDA Y SIN BLOQUEOS) QUE TÚ COMPROBASTE ---
  async procesarFotoCedula(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!this.funcionarioSeleccionado) {
      this.mostrarMensaje('Seleccione un funcionario antes de firmar.', 'warning');
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      console.log('1. Formateando imagen...');
      const base64Image = await this.formatearImagenParaPDF(file);

      const nombreFuncionario = this.funcionarioSeleccionado.nombreCompleto || 'Sin Nombre';
      const areaFuncionario = this.funcionarioSeleccionado.area || 'Sin Área';

      console.log('2. Generando PDF con jsPDF...');
      const doc = new jsPDF();

      // Configuración del documento
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text('ACTA DE ENTREGA DE EQUIPAMIENTO - GATI', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 35);

      const textoDeclaracion = `Yo, ${nombreFuncionario}, del departamento de ${areaFuncionario}, por medio de la imagen de mi cédula de identidad adjunta en este documento, certifico haber recibido conforme el siguiente equipamiento informático para el desempeño de mis funciones:`;
      const lineasTexto = doc.splitTextToSize(textoDeclaracion, 170);
      doc.text(lineasTexto, 20, 45);

      let yPos = 45 + (lineasTexto.length * 7) + 5;

      // Detalles del equipo
      doc.setFont("helvetica", "bold");
      doc.text(`- Tipo de Activo:`, 25, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`${this.equipoSeleccionado.tipo || this.equipoSeleccionado.categoria}`, 65, yPos);
      yPos += 7;

      doc.setFont("helvetica", "bold");
      doc.text(`- Marca:`, 25, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`${this.equipoSeleccionado.marca || 'N/A'}`, 45, yPos);
      yPos += 7;

      doc.setFont("helvetica", "bold");
      doc.text(`- Modelo:`, 25, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`${this.equipoSeleccionado.modelo || 'N/A'}`, 48, yPos);
      yPos += 7;

      doc.setFont("helvetica", "bold");
      doc.text(`- Serie / ID:`, 25, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`${this.equipoSeleccionado.identificador}`, 52, yPos);
      yPos += 15;

      doc.setFont("helvetica", "bold");
      doc.text('Cédula de Identidad del Receptor:', 20, yPos);
      yPos += 5;

      // Inserción de la imagen forzada a JPEG
      doc.addImage(base64Image, 'JPEG', 45, yPos, 120, 80);

      const nombreArchivo = `${this.equipoSeleccionado.identificador}_${Date.now()}.pdf`;

      console.log('3. Descargando copia local...');
      doc.save(nombreArchivo);

      console.log('4. Extrayendo Base64 nativo...');
      // Obtenemos directamente el formato data URI y le cortamos la cabecera para Firebase
      const dataUrl = doc.output('datauristring');
      const pdfBase64 = dataUrl.split(',')[1];

      console.log('5. Subiendo a Firebase Storage (Nativo)...');
      const coleccion = this.equipoSeleccionado.categoria === 'Hardware' ? 'hardware' : 'software';
      const actaUrl = await this.dbService.subirActaPDF(pdfBase64, nombreArchivo);

      console.log('6. Guardando asignación en Base de Datos...');
      const destinoGATI = {
        nombre: nombreFuncionario,
        area: areaFuncionario,
        rut: this.funcionarioSeleccionado.rut || ''
      };
      await this.dbService.asignarActivo(coleccion, this.equipoSeleccionado.id, destinoGATI, actaUrl);

      console.log('7. ¡Éxito Total!');
      this.cerrarModalAsignar();
      this.mostrarMensaje('Acta PDF generada y guardada exitosamente', 'success');
      this.cargarInventario();

    } catch (error: any) {
      console.error('Error general capturado:', error);
      const errorMsg = error?.message || 'Error desconocido';
      this.mostrarMensaje('Ocurrió un error: ' + errorMsg, 'danger');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
      event.target.value = '';
    }
  }

  // --- LÓGICA DE DEVOLUCIÓN (Copia exacta a la asignación que ya funciona) ---
  async procesarFotoDevolucion(event: any) {
    const file = event.target.files[0];
    if (!file || !this.equipoParaDevolver) return;

    const item = this.equipoParaDevolver;
    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      console.log('1. Formateando imagen para devolución...');
      const base64Image = await this.formatearImagenParaPDF(file);

      const nombreFuncionario = item.asignadoA_nombre || 'Sin Nombre';
      const areaFuncionario = item.asignadoA_area || 'Sin Área';

      console.log('2. Generando PDF de devolución...');
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

      console.log('3. Descargando copia local...');
      doc.save(nombreArchivo);

      console.log('4. Extrayendo Base64 nativo...');
      const dataUrl = doc.output('datauristring');
      const pdfBase64 = dataUrl.split(',')[1];
      const coleccion = item.categoria === 'Hardware' ? 'hardware' : 'software';

      console.log('5. Subiendo a Firebase Storage (Nativo)...');
      const actaUrl = await this.dbService.subirActaPDF(pdfBase64, nombreArchivo);

      console.log('6. Guardando desvinculación en Base de Datos...');
      await this.dbService.desvincularActivo(coleccion, item.id, nombreFuncionario, areaFuncionario, actaUrl);

      console.log('7. ¡Éxito Total en la Devolución!');
      this.cerrarModalDevolver();
      this.mostrarMensaje('Equipo devuelto y acta guardada exitosamente', 'success');
      this.cargarInventario();

    } catch (error: any) {
      console.error('Error general capturado en devolución:', error);
      const errorMsg = error?.message || 'Error desconocido';
      this.mostrarMensaje('Ocurrió un error: ' + errorMsg, 'danger');
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
        { type: 'radio', label: 'Robo o Pérdida', value: 'Robo o Pérdida' },
        { type: 'radio', label: 'Término de Vida Útil', value: 'Término de Vida Útil' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar Baja', role: 'destructive', handler: async (motivoSeleccionado) => {
            if (!motivoSeleccionado) {
              this.mostrarMensaje('Debe seleccionar un motivo para auditoría', 'warning');
              return false;
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
      header: 'Cerrar Sesión', message: '¿Deseas salir del sistema?', buttons: [
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

  calcularObsolescencia(equipo: any) {
    let fechaBase = new Date();
    if (equipo.fechaIngreso) fechaBase = equipo.fechaIngreso.toDate ? equipo.fechaIngreso.toDate() : new Date(equipo.fechaIngreso);
    const fechaMuerte = new Date(fechaBase);
    fechaMuerte.setFullYear(fechaMuerte.getFullYear() + 6);
    const hoy = new Date();
    const mesesRestantes = (fechaMuerte.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

    if (mesesRestantes <= 0) { this.mensajeObsolescencia = 'ALERTA: Equipo obsoleto (Superó los 6 años).'; this.colorObsolescencia = 'danger'; }
    else if (mesesRestantes <= 12) { this.mensajeObsolescencia = `Atención: Quedan ${Math.floor(mesesRestantes)} meses de vida útil.`; this.colorObsolescencia = 'warning'; }
    else { this.mensajeObsolescencia = `Vida útil restante: aprox. ${Math.floor(mesesRestantes / 12)} años.`; this.colorObsolescencia = 'success'; }
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

  async abrirModalHistorial(equipo: any) {
    this.equipoParaHistorial = equipo;
    const coleccion = equipo.categoria === 'Hardware' ? 'hardware' : 'software';
    this.historialActivo = await this.dbService.obtenerHistorialActivo(coleccion, equipo.id);
    this.isHistorialModalOpen = true;
    this.cdr.detectChanges();
  }

  cerrarModalHistorial() {
    this.isHistorialModalOpen = false;
    this.equipoParaHistorial = null;
    this.historialActivo = [];
  }
}
