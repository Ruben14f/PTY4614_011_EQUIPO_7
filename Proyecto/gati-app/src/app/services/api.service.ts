import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  // Tu URL limpia de GitHub Gist
  private apiUrl = 'https://gist.githubusercontent.com/Bushido13/556790b5e2695dfa9a321d5b967c750e/raw/ordenes.json';

  constructor() {}

async consultarOC(numeroOC: string) {
    let ordenes: any;

    // 1. Primero intentamos descargar los datos de internet
    try {
      ordenes = await firstValueFrom(this.http.get(this.apiUrl));
    } catch (error) {
      console.error('Error de red:', error);
      throw new Error('No se pudo conectar con el servidor externo.');
    }

    // 2. Una vez descargados, buscamos si la OC existe
    if (ordenes && ordenes[numeroOC]) {
      return ordenes[numeroOC];
    } else {
      // Si la descarga fue exitosa pero la OC no está en el JSON, mostramos tu mensaje:
      throw new Error(`La Orden de Compra "${numeroOC}" no existe. Por favor, verifique si el número es correcto.`);
    }
  }
}
