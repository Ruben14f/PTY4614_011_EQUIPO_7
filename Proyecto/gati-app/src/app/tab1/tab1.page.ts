import { Component, inject, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController, ToastController, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon, IonGrid, IonRow, IonCol,
  IonCard, IonCardContent, IonSegment, IonSegmentButton, IonLabel, IonMenuButton, IonCardHeader, IonCardTitle
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import { logOutOutline, desktopOutline, checkmarkCircleOutline, timeOutline, closeCircleOutline } from 'ionicons/icons';

import { BaseChartDirective } from 'ng2-charts';
import { ChartOptions, ChartData } from 'chart.js';

import { DatabaseService } from '../services/database.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonIcon, IonGrid, IonRow, IonCol,
    IonCard, IonCardContent, IonSegment, IonSegmentButton, IonLabel, IonMenuButton, IonCardHeader, IonCardTitle,
    BaseChartDirective
  ],
})
export class Tab1Page {
  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;

  private _viewMode: string = 'hardware';
  get viewMode(): string {
    return this._viewMode;
  }
  set viewMode(value: string) {
    this._viewMode = value;

    // 1. Obligamos a Angular a pintar la nueva pestaña en el HTML instantáneamente
    this.cdr.detectChanges();

    // 2. Ajustamos los gráficos
    setTimeout(() => {
      this.actualizarGraficos();
      window.dispatchEvent(new Event('resize'));
    }, 150);
  }

  private dbService = inject(DatabaseService);
  private apiService = inject(ApiService);
  private auth = inject(Auth);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  // Inyectamos el ChangeDetectorRef que recordaste
  private cdr = inject(ChangeDetectorRef);

  hardwareStats = { total: 0, asignados: 0, inventario: 0, baja: 0 };
  softwareStats = { total: 0, asignados: 0, inventario: 0, baja: 0 };

  get currentStats() { return this.viewMode === 'hardware' ? this.hardwareStats : this.softwareStats; }

  donutOptions: ChartOptions<'doughnut'> = { responsive: true, maintainAspectRatio: false };
  lineOptions: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false };

  hwDonutData: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [], backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'] }] };
  hwLineData: ChartData<'line'> = { labels: [], datasets: [{ label: 'Ingresos Históricos', data: [], borderColor: '#007bff', tension: 0.4 }] };

  swDonutData: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [], backgroundColor: ['#17a2b8', '#6c757d', '#fd7e14', '#6610f2', '#e83e8c'] }] };
  swLineData: ChartData<'line'> = { labels: [], datasets: [{ label: 'Adquisición Histórica', data: [], borderColor: '#17a2b8', tension: 0.4 }] };

  recentOrders: any[] = [];
  obsoleteHardware: any[] = [];
  contratosVigentes: any[] = [];

  constructor() {
    addIcons({ logOutOutline, desktopOutline, checkmarkCircleOutline, timeOutline, closeCircleOutline });
  }

  async ionViewWillEnter() {
    await this.cargarDatosReales();
  }

  actualizarGraficos() {
    if (this.charts) {
      this.charts.forEach(chart => {
        if (chart.chart) {
          chart.chart.update();
        }
      });
    }
  }

  completarAñosHistoricos(conteoAnual: any): { labels: string[], data: number[] } {
    const añoActual = new Date().getFullYear();
    const minAño = Math.min(...Object.keys(conteoAnual).map(Number), añoActual - 2);

    const etiquetas = [];
    const datos = [];

    for (let año = minAño; año <= añoActual; año++) {
      etiquetas.push(año.toString());
      datos.push(conteoAnual[año] || 0);
    }

    return { labels: etiquetas, data: datos };
  }

  async cargarDatosReales() {
    const hardware = await this.dbService.obtenerTodoHardware();
    const software = await this.dbService.obtenerTodoSoftware();
    const ordenesExternas = await this.apiService.obtenerTodasLasOrdenes();

    this.procesarHardware(hardware);
    this.procesarSoftware(software);
    this.procesarOrdenes(ordenesExternas, hardware, software);

    // EL PARCHE INFALIBLE: Forzamos a Angular a construir el HTML con los datos
    this.cdr.detectChanges();

    // EL TRUCO DEL F12: Una vez que el HTML existe, repintamos los gráficos
    setTimeout(() => {
      this.actualizarGraficos();
      window.dispatchEvent(new Event('resize'));
    }, 150);
  }

  procesarHardware(hwDB: any[]) {
    this.hardwareStats = { total: hwDB.length, asignados: 0, inventario: 0, baja: 0 };
    const conteoTipos: any = {};
    const conteoAnual: any = {};
    this.obsoleteHardware = [];
    const hoy = new Date();

    hwDB.forEach(hw => {
      if (hw.estado === 'En Inventario') this.hardwareStats.inventario++;
      else if (hw.estado === 'Asignado') this.hardwareStats.asignados++;
      else if (hw.estado === 'De Baja') this.hardwareStats.baja++;

      const tipo = hw.tipo || 'Otro';
      conteoTipos[tipo] = (conteoTipos[tipo] || 0) + 1;

      if (hw.fechaIngreso) {
        const fechaObj = hw.fechaIngreso.toDate ? hw.fechaIngreso.toDate() : new Date(hw.fechaIngreso);
        const año = fechaObj.getFullYear();
        conteoAnual[año] = (conteoAnual[año] || 0) + 1;

        const añosAntiguedad = (hoy.getTime() - fechaObj.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (añosAntiguedad >= 6 && hw.estado !== 'De Baja') {
          this.obsoleteHardware.push({
            serie: hw.serie,
            tipo: `${hw.tipo} ${hw.marca}`,
            anios: Math.floor(añosAntiguedad)
          });
        }
      }
    });

    this.hwDonutData = { ...this.hwDonutData, labels: Object.keys(conteoTipos), datasets: [{ ...this.hwDonutData.datasets[0], data: Object.values(conteoTipos) }] };
    const historial = this.completarAñosHistoricos(conteoAnual);
    this.hwLineData = { ...this.hwLineData, labels: historial.labels, datasets: [{ ...this.hwLineData.datasets[0], data: historial.data }] };
  }

 procesarSoftware(swDB: any[]) {
    this.softwareStats = { total: 0, asignados: 0, inventario: 0, baja: 0 };
    const conteoMarcas: any = {};
    const conteoAnual: any = {};
    this.contratosVigentes = []; // Limpiamos el arreglo

    const hoy = new Date();
    const añoActual = hoy.getFullYear();

    swDB.forEach(sw => {
      const total = sw.cantidadTotal || 0;
      const disp = sw.cantidadDisponible !== undefined ? sw.cantidadDisponible : total;
      const asignados = total - disp;

      this.softwareStats.total += total;
      this.softwareStats.inventario += disp;
      this.softwareStats.asignados += asignados;

      if (sw.fechaIngreso) {
        const fIngreso = sw.fechaIngreso.toDate ? sw.fechaIngreso.toDate() : new Date(sw.fechaIngreso);
        const fVence = new Date(fIngreso);
        fVence.setFullYear(fVence.getFullYear() + 1);

        if (fVence < hoy) this.softwareStats.baja += total;

        const año = fIngreso.getFullYear();
        conteoAnual[año] = (conteoAnual[año] || 0) + total;

        // NUEVA LÓGICA: Llenar la tabla SOLO con contratos del año actual
        if (año === añoActual) {
          const diasRestantes = Math.ceil((fVence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          let estadoContrato = 'Vigente';
          if (diasRestantes <= 0) estadoContrato = 'Agotado / Vencido';
          else if (diasRestantes <= 30) estadoContrato = 'Por Renovar';

          const porcentajeOcupacion = total > 0 ? Math.round((asignados / total) * 100) : 0;

          this.contratosVigentes.push({
            software: `${sw.marca} ${sw.modelo}`,
            oc: sw.ocAsociada || 'Sin OC',
            ocupacionTexto: `${asignados} / ${total}`,
            porcentaje: porcentajeOcupacion,
            fechaVencimiento: fVence,
            estado: estadoContrato
          });
        }
      }

      const marca = sw.marca || 'Otro';
      conteoMarcas[marca] = (conteoMarcas[marca] || 0) + total;
    });

    // Ordenar para que los contratos que vencen primero salgan arriba
    this.contratosVigentes.sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime());

    this.swDonutData = { ...this.swDonutData, labels: Object.keys(conteoMarcas), datasets: [{ ...this.swDonutData.datasets[0], data: Object.values(conteoMarcas) }] };
    const historial = this.completarAñosHistoricos(conteoAnual);
    this.swLineData = { ...this.swLineData, labels: historial.labels, datasets: [{ ...this.swLineData.datasets[0], data: historial.data }] };
  }

  procesarOrdenes(ordenesObj: any, hwDB: any[], swDB: any[]) {
    if (!ordenesObj) return;

    const ordenesArray = Object.keys(ordenesObj).map(key => ({ oc: key, ...ordenesObj[key] }));
    ordenesArray.sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());

    this.recentOrders = ordenesArray.map(o => {
      let totalItems = 0;
      let receivedItems = 0;

      o.articulos.forEach((art: any) => {
        totalItems += art.cantidadTotal;

        if (art.tipo === 'Licencia') {
          const loteExiste = swDB.some(s => s.ocAsociada === o.oc && s.marca === art.marca);
          if (loteExiste) receivedItems += art.cantidadTotal;
        } else {
          const conteoReales = hwDB.filter(h => h.ocAsociada === o.oc && h.tipo === art.tipo).length;
          receivedItems += conteoReales;
        }
      });

      let estadoCalculado = 'Pendiente';
      if (receivedItems > 0 && receivedItems < totalItems) estadoCalculado = 'Parcial';
      if (receivedItems >= totalItems && totalItems > 0) estadoCalculado = 'Completada';

      return { oc: o.oc, proveedor: o.proveedor, fecha: o.fechaEmision, estado: estadoCalculado };
    });
  }

  async onLogout() {
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
}
