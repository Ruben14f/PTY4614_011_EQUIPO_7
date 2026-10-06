import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ToastController, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon, IonGrid, IonRow, IonCol,
  IonCard, IonCardContent, IonSegment, IonSegmentButton, IonLabel, IonMenuButton, IonCardHeader, IonCardTitle
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import { logOutOutline, desktopOutline, checkmarkCircleOutline, timeOutline, closeCircleOutline } from 'ionicons/icons';

// Importamos el componente de gráficos
import { BaseChartDirective } from 'ng2-charts';
import { ChartOptions, ChartData } from 'chart.js';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonIcon, IonGrid, IonRow, IonCol,
    IonCard, IonCardContent, IonSegment, IonSegmentButton, IonLabel, IonMenuButton, IonCardHeader, IonCardTitle,
    BaseChartDirective // <-- Inyectamos la capacidad de dibujar gráficos
  ],
})
export class Tab1Page {

  viewMode: string = 'hardware';

  // 1. Estadísticas Base
  hardwareStats = { total: 248, asignados: 182, inventario: 54, baja: 12 };
  softwareStats = { total: 120, asignados: 90, inventario: 15, baja: 15 };

  get currentStats() { return this.viewMode === 'hardware' ? this.hardwareStats : this.softwareStats; }

  // 2. Opciones de los Gráficos
  donutOptions: ChartOptions<'doughnut'> = { responsive: true, maintainAspectRatio: false };
  lineOptions: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false };

  // 3. Datos: Gráficos de Hardware
  hwDonutData: ChartData<'doughnut'> = {
    labels: ['Notebooks', 'Monitores', 'Periféricos', 'Servidores'],
    datasets: [{ data: [120, 80, 40, 8], backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545'] }]
  };
  hwLineData: ChartData<'line'> = {
    labels: ['2021', '2022', '2023', '2024', '2025'],
    datasets: [{ label: 'Inversión en Hardware (MM$)', data: [15, 22, 18, 30, 25], borderColor: '#007bff', tension: 0.4 }]
  };

  // 4. Datos: Gráficos de Software
  swDonutData: ChartData<'doughnut'> = {
    labels: ['Office 365', 'Antivirus', 'Adobe', 'Sistemas MOP'],
    datasets: [{ data: [60, 30, 15, 15], backgroundColor: ['#17a2b8', '#6c757d', '#fd7e14', '#6610f2'] }]
  };
  swLineData: ChartData<'line'> = {
    labels: ['2021', '2022', '2023', '2024', '2025'],
    datasets: [{ label: 'Inversión en Licencias (MM$)', data: [5, 7, 10, 12, 15], borderColor: '#17a2b8', tension: 0.4 }]
  };

  // 5. Datos: Tablas (Mockups)
  recentOrders = [
    { oc: 'OC-2025-0154', fecha: '10-04-2025', proveedor: 'Dell Chile', estado: 'Recepcionada', monto: '$10.990.000' },
    { oc: 'OC-2025-0112', fecha: '08-03-2025', proveedor: 'Microsoft', estado: 'En proceso', monto: '$5.450.000' }
  ];

 obsoleteHardware = [
    { serie: '5CD3241ABC', tipo: 'Notebook Dell', fechaCompra: '15-01-2018', anios: 7 },
    { serie: '9MN3456HJK', tipo: 'PC Escritorio HP', fechaCompra: '22-08-2017', anios: 8 }
  ];

  constructor(private auth: Auth, private router: Router, private toastController: ToastController) {
    addIcons({ logOutOutline, desktopOutline, checkmarkCircleOutline, timeOutline, closeCircleOutline });
  }

  async onLogout() {
    await signOut(this.auth);
    const toast = await this.toastController.create({ message: 'Sesión cerrada.', duration: 2500, position: 'top', color: 'success' });
    await toast.present();
    this.router.navigate(['/login']);
  }
}
