import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

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
        loadComponent: () => import('../administracion/administracion.page').then(m => m.AdministracionPage)
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
