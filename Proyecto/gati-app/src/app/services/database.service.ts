import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp, query, where, getDocs } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private firestore: Firestore = inject(Firestore);

  constructor() { }

  async registrarHardware(equipo: any) {
    // ... (Mantén tu función actual exactamente igual)
    try {
      const hardwareRef = collection(this.firestore, 'hardware');
      const docRef = await addDoc(hardwareRef, {
        ...equipo,
        fechaIngreso: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error al guardar en Firestore:', error);
      throw error;
    }
  }

  // NUEVA FUNCIÓN: Busca en Firebase cuántos equipos de esta OC ya se guardaron
  async obtenerEquiposPorOC(numeroOC: string) {
    try {
      const hardwareRef = collection(this.firestore, 'hardware');
      // Filtramos la base de datos para traer solo los de esta OC
      const q = query(hardwareRef, where('ocAsociada', '==', numeroOC.toUpperCase()));
      const querySnapshot = await getDocs(q);

      // Mapeamos los resultados a un arreglo
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error al leer de Firestore:', error);
      return [];
    }
  }

  // NUEVA FUNCIÓN: Verifica si la serie ya existe en TODO el inventario
  async verificarSerieExiste(serie: string): Promise<boolean> {
    try {
      const hardwareRef = collection(this.firestore, 'hardware');
      const q = query(hardwareRef, where('serie', '==', serie.toUpperCase()));
      const querySnapshot = await getDocs(q);

      // Retorna true si encontró al menos un documento, false si está libre
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error al verificar serie global:', error);
      throw error; // Lanzamos el error para atraparlo en la vista
    }
  }

  // TRAER TODO EL HARDWARE
  async obtenerTodoHardware() {
    try {
      const hardwareRef = collection(this.firestore, 'hardware');
      const querySnapshot = await getDocs(hardwareRef);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error al obtener hardware:', error);
      return [];
    }
  }

  // TRAER TODO EL SOFTWARE
  async obtenerTodoSoftware() {
    try {
      const softwareRef = collection(this.firestore, 'licencias_software');
      const querySnapshot = await getDocs(softwareRef);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error al obtener software:', error);
      return [];
    }
  }
}
