import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = 'https://gist.githubusercontent.com/Bushido13/556790b5e2695dfa9a321d5b967c750e/raw/ordenes.json';

  constructor() {}

  async consultarOC(numeroOC: string) {
    let ordenes: any;
    try {
      ordenes = await firstValueFrom(this.http.get(this.apiUrl));
    } catch (error) {
      console.error('Error de red:', error);
      throw new Error('No se pudo conectar con el servidor externo.');
    }

    if (ordenes && ordenes[numeroOC]) {
      return ordenes[numeroOC];
    } else {
      throw new Error(`La Orden de Compra "${numeroOC}" no existe. Por favor, verifique si el número es correcto.`);
    }
  }

  // NUEVO MÉTODO PARA EL DASHBOARD
  async obtenerTodasLasOrdenes() {
    try {
      return await firstValueFrom(this.http.get(this.apiUrl));
    } catch (error) {
      console.error('Error al obtener órdenes:', error);
      return {};
    }
  }
}
