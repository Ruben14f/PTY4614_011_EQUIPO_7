import { Injectable, inject } from '@angular/core';
// AÑADIDOS: doc, updateDoc
import { Firestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private firestore: Firestore = inject(Firestore);

  constructor() { }

  async registrarHardware(equipo: any) {
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

  async obtenerEquiposPorOC(numeroOC: string) {
    try {
      const hardwareRef = collection(this.firestore, 'hardware');
      const q = query(hardwareRef, where('ocAsociada', '==', numeroOC.toUpperCase()));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error al leer de Firestore:', error);
      return [];
    }
  }

  async verificarSerieExiste(serie: string): Promise<boolean> {
    try {
      const hardwareRef = collection(this.firestore, 'hardware');
      const q = query(hardwareRef, where('serie', '==', serie.toUpperCase()));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error al verificar serie global:', error);
      throw error;
    }
  }

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

  // --- SECCIÓN FUNCIONARIOS ---
  async obtenerFuncionarios() {
    try {
      const funcionariosRef = collection(this.firestore, 'funcionarios');
      const querySnapshot = await getDocs(funcionariosRef);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error al obtener funcionarios:', error);
      return [];
    }
  }

  async registrarFuncionario(funcionario: any) {
    try {
      const funcionariosRef = collection(this.firestore, 'funcionarios');
      await addDoc(funcionariosRef, funcionario);
    } catch (error) {
      console.error('Error al registrar funcionario:', error);
      throw error;
    }
  }

  // --- SECCIÓN USUARIOS DEL SISTEMA ---
  async obtenerUsuariosSistema() {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios_sistema');
      const querySnapshot = await getDocs(usuariosRef);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return [];
    }
  }

  async registrarUsuarioSistema(usuario: any) {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios_sistema');
      await addDoc(usuariosRef, usuario);
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      throw error;
    }
  }

  async verificarAutorizacion(correo: string): Promise<boolean> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios_sistema');
      const q = query(usuariosRef, where('correo', '==', correo));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return false;
      }

      const datosUsuario = snapshot.docs[0].data();
      return datosUsuario['estado'] === 'Activo';
    } catch (error) {
      console.error('Error al verificar autorización:', error);
      return false;
    }
  }

  async esAdministrador(correo: string): Promise<boolean> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios_sistema');
      const q = query(usuariosRef, where('correo', '==', correo), where('rol', '==', 'Administrador'));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }

  // --- FUNCIÓN UNIVERSAL PARA ASIGNAR ---
  async asignarActivo(coleccion: string, idActivo: string, destino: any): Promise<void> {
    try {
      const activoRef = doc(this.firestore, `${coleccion}/${idActivo}`);
      await updateDoc(activoRef, {
        estado: 'Asignado', // Ajustado para que las insignias de color funcionen
        asignadoA_rut: destino.rut,
        asignadoA_nombre: destino.nombre,
        asignadoA_area: destino.area,
        fechaAsignacion: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error al asignar en la colección ${coleccion}:`, error);
      throw error;
    }
  }

  // --- FUNCIÓN PARA DESVINCULAR (Devolver a Bodega) ---
  async desvincularActivo(coleccion: string, idActivo: string): Promise<void> {
    try {
      const activoRef = doc(this.firestore, `${coleccion}/${idActivo}`);
      await updateDoc(activoRef, {
        estado: 'En Inventario',
        asignadoA_rut: '',
        asignadoA_nombre: '',
        asignadoA_area: '',
        fechaAsignacion: ''
      });
    } catch (error) {
      console.error(`Error al desvincular en ${coleccion}:`, error);
      throw error;
    }
  }

  // --- FUNCIÓN PARA DAR DE BAJA (Sacar de circulación) ---
  async darDeBajaActivo(coleccion: string, idActivo: string, motivo: string): Promise<void> {
    try {
      const activoRef = doc(this.firestore, `${coleccion}/${idActivo}`);
      await updateDoc(activoRef, {
        estado: 'De Baja',
        motivoBaja: motivo,
        fechaBaja: new Date().toISOString(),
        // Limpiamos a la persona porque el equipo ya no existe operativamente
        asignadoA_rut: '',
        asignadoA_nombre: '',
        asignadoA_area: ''
      });
    } catch (error) {
      console.error(`Error al dar de baja en ${coleccion}:`, error);
      throw error;
    }
  }
}
