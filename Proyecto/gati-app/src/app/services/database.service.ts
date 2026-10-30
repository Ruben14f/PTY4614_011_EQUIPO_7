import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, orderBy, increment, arrayUnion, arrayRemove } from '@angular/fire/firestore';
import { FirebaseApp } from '@angular/fire/app';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);

  constructor() { }

  async registrarHardware(equipo: any) {
    try {
      // Tomamos la fecha de la OC si existe, si no, usamos la del servidor
      const fechaFinal = equipo.fechaSimulada ? new Date(equipo.fechaSimulada).toISOString() : serverTimestamp();

      const hardwareRef = collection(this.firestore, 'hardware');
      const docRef = await addDoc(hardwareRef, {
        ...equipo,
        fechaIngreso: fechaFinal
      });
      return docRef.id;
    } catch (error) {
      console.error('Error al guardar en Firestore:', error);
      throw error;
    }
  }

  async registrarLicenciaLote(licencia: any) {
    try {
      // Tomamos la fecha de la OC si existe, si no, usamos la del servidor
      const fechaFinal = licencia.fechaSimulada ? new Date(licencia.fechaSimulada).toISOString() : serverTimestamp();

      const softwareRef = collection(this.firestore, 'licencias_software');
      const docRef = await addDoc(softwareRef, {
        ...licencia,
        fechaIngreso: fechaFinal,
        cantidadDisponible: licencia.cantidadTotal,
        asignados: []
      });
      return docRef.id;
    } catch (error) {
      console.error('Error al guardar licencia en Firestore:', error);
      throw error;
    }
  }

  // Función auxiliar para saber si un ID de contrato ya fue ingresado antes
  async verificarContratoExiste(idContrato: string): Promise<boolean> {
    try {
      const softwareRef = collection(this.firestore, 'licencias_software');
      const q = query(softwareRef, where('identificador', '==', idContrato.toUpperCase()));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error al verificar contrato:', error);
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

  async obtenerLicenciasPorOC(numeroOC: string) {
    try {
      const softwareRef = collection(this.firestore, 'licencias_software');
      const q = query(softwareRef, where('ocAsociada', '==', numeroOC.toUpperCase()));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error al leer licencias de Firestore:', error);
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
      if (snapshot.empty) return false;
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

  async asignarActivo(coleccion: string, idActivo: string, destino: any, actaUrl: string = ''): Promise<void> {
    const activoRef = doc(this.firestore, `${coleccion}/${idActivo}`);
    const fechaActual = new Date().toISOString();

    await updateDoc(activoRef, {
      estado: 'Asignado',
      asignadoA_rut: destino.rut || '',
      asignadoA_nombre: destino.nombre,
      asignadoA_area: destino.area,
      fechaAsignacion: fechaActual,
      actaUrl: actaUrl
    });

    const historialRef = collection(this.firestore, `${coleccion}/${idActivo}/historial`);
    await addDoc(historialRef, {
      tipoAccion: 'Asignación',
      funcionario: destino.nombre,
      area: destino.area,
      fecha: fechaActual,
      actaUrl: actaUrl
    });
  }

  async desvincularActivo(
    coleccion: string,
    idActivo: string,
    nombreDevuelve: string = 'N/A',
    areaDevuelve: string = 'Inventario',
    actaUrl: string = ''
  ): Promise<void> {
    const activoRef = doc(this.firestore, `${coleccion}/${idActivo}`);
    const fechaActual = new Date().toISOString();

    await updateDoc(activoRef, {
      estado: 'En Inventario',
      asignadoA_rut: '',
      asignadoA_nombre: '',
      asignadoA_area: '',
      fechaAsignacion: '',
      actaUrl: ''
    });

    const historialRef = collection(this.firestore, `${coleccion}/${idActivo}/historial`);
    await addDoc(historialRef, {
      tipoAccion: 'Devolución a Bodega',
      funcionario: nombreDevuelve || 'N/A',
      area: areaDevuelve || 'Inventario',
      fecha: fechaActual,
      actaUrl: actaUrl
    });
  }

  async darDeBajaActivo(coleccion: string, idActivo: string, motivo: string): Promise<void> {
    const activoRef = doc(this.firestore, `${coleccion}/${idActivo}`);
    const fechaActual = new Date().toISOString();

    await updateDoc(activoRef, {
      estado: 'De Baja',
      motivoBaja: motivo,
      fechaBaja: fechaActual,
      asignadoA_rut: '',
      asignadoA_nombre: '',
      asignadoA_area: ''
    });

    const historialRef = collection(this.firestore, `${coleccion}/${idActivo}/historial`);
    await addDoc(historialRef, {
      tipoAccion: `Baja: ${motivo}`,
      funcionario: 'N/A',
      area: 'Fuera de circulación',
      fecha: fechaActual
    });
  }

  async obtenerHistorialActivo(coleccion: string, idActivo: string): Promise<any[]> {
    try {
      const historialRef = collection(this.firestore, `${coleccion}/${idActivo}/historial`);
      const q = query(historialRef, orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  }

  async asignarLicencia(idSoftware: string, destino: any): Promise<void> {
    const softwareRef = doc(this.firestore, `licencias_software/${idSoftware}`);
    const fechaActual = new Date().toISOString();

    const asignacion = { ...destino, fechaEntrega: fechaActual };

    await updateDoc(softwareRef, {
      cantidadDisponible: increment(-1),
      asignados: arrayUnion(asignacion)
    });

    const historialRef = collection(this.firestore, `licencias_software/${idSoftware}/historial`);
    await addDoc(historialRef, {
      tipoAccion: 'Asignación de Licencia',
      funcionario: destino.nombre,
      area: destino.area,
      fecha: fechaActual
    });
  }

  async desvincularLicencia(idSoftware: string, personaAsignada: any): Promise<void> {
    const softwareRef = doc(this.firestore, `licencias_software/${idSoftware}`);
    const fechaActual = new Date().toISOString();

    await updateDoc(softwareRef, {
      cantidadDisponible: increment(1),
      asignados: arrayRemove(personaAsignada)
    });

    const historialRef = collection(this.firestore, `licencias_software/${idSoftware}/historial`);
    await addDoc(historialRef, {
      tipoAccion: 'Revocación de Licencia',
      funcionario: personaAsignada.nombre || 'N/A',
      area: personaAsignada.area || 'N/A',
      fecha: fechaActual
    });
  }

  async subirActaPDF(base64Data: string, nombreArchivo: string): Promise<string> {
    console.log('1. Empaquetando PDF binario para subida directa...');
    const base64Limpio = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const byteCharacters = atob(base64Limpio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

    const bucket = 'gati-mop.firebasestorage.app';
    const rutaCodificada = encodeURIComponent(`actas/${nombreArchivo}`);
    const urlSubida = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${rutaCodificada}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf'
    };

    if (this.auth.currentUser) {
      const token = await this.auth.currentUser.getIdToken();
      headers['Authorization'] = `Firebase ${token}`;
    }

    console.log('2. Subiendo documento a Firebase Storage...');
    const response = await fetch(urlSubida, {
      method: 'POST',
      headers,
      body: pdfBlob
    });

    if (!response.ok) {
      const errorTexto = await response.text();
      throw new Error(`Fallo en Storage (${response.status}): ${errorTexto}`);
    }

    const data = await response.json();
    const tokenDescarga = data.downloadTokens ? data.downloadTokens.split(',')[0] : '';
    const urlFinal = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${rutaCodificada}?alt=media&token=${tokenDescarga}`;

    console.log('3. ¡Archivo subido! URL Lista:', urlFinal);
    return urlFinal;
  }

  // --- NUEVAS FUNCIONES PARA GESTIÓN DE USUARIOS ---
  async actualizarRolUsuario(idUsuario: string, nuevoRol: string): Promise<void> {
    try {
      const usuarioRef = doc(this.firestore, `usuarios_sistema/${idUsuario}`);
      await updateDoc(usuarioRef, { rol: nuevoRol });
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      throw error;
    }
  }

  async actualizarEstadoUsuario(idUsuario: string, nuevoEstado: string): Promise<void> {
    try {
      const usuarioRef = doc(this.firestore, `usuarios_sistema/${idUsuario}`);
      await updateDoc(usuarioRef, { estado: nuevoEstado });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      throw error;
    }
  }
}
