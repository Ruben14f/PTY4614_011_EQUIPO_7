import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private firestore: Firestore = inject(Firestore);

  constructor() { }

  async registrarHardware(equipo: any) {
    try {
      // Apuntamos a la colección 'hardware' que definimos en el diagrama NoSQL
      const hardwareRef = collection(this.firestore, 'hardware');

      // addDoc crea un documento con un ID alfanumérico automático
      // serverTimestamp() obtiene la hora exacta de los servidores de Google
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
}
