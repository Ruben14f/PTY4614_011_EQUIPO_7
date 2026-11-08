import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';
import { adminGuard } from '../guards/admin-guard'; // <-- 1. IMPORTAMOS EL GUARDIA

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../tab1/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'inventario',
        loadComponent: () => import('../inventario/inventario.page').then((m) => m.InventarioPage),
      },
      {
        path: 'recepcion',
        loadComponent: () => import('../recepcion/recepcion.page').then(m => m.RecepcionPage),
        canDeactivate: [(component: any) => component.confirmarSalida()]
      },
      {
        path: 'administracion',
        loadComponent: () => import('../administracion/administracion.page').then(m => m.AdministracionPage),
        canActivate: [adminGuard] // <-- 2. PROTEGEMOS ESTA RUTA ESPECÍFICA
      },
      {
        path: '',
        redirectTo: '/tabs/dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/dashboard',
    pathMatch: 'full',
  },
];
