import { HttpClient, HttpEvent, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  Actividad,
  ActividadActiva,
  AnulacionItem,
  AsociadoAuditoriaItem,
  AsociadoBusqueda,
  AuditoriaGlobalLog,
  ControlDiarioResponse,
  EntregaRegistrada,
  EvaluacionCobertura,
  ImportacionExcelItem,
  LoginResponse,
  MeResponse,
  MiTurnoResponse,
  RefreshResponse,
  ReporteJobStatus,
  Sede,
  UserRole,
  UsuarioAdmin,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1';

  // --- Auth ---
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.base}/auth/login`,
      { username, password },
      { withCredentials: true },
    );
  }

  refresh(): Observable<RefreshResponse> {
    return this.http.post<RefreshResponse>(
      `${this.base}/auth/refresh`,
      {},
      { withCredentials: true },
    );
  }

  logout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.base}/auth/logout`,
      {},
      { withCredentials: true },
    );
  }

  cambiarClaveInicial(
    password_actual: string,
    password_nueva: string,
  ): Observable<{ access_token: string; expires_in: number; debe_cambiar_clave: boolean }> {
    return this.http.post<{
      access_token: string;
      expires_in: number;
      debe_cambiar_clave: boolean;
    }>(
      `${this.base}/auth/cambiar-clave-inicial`,
      { password_actual, password_nueva },
      { withCredentials: true },
    );
  }

  cambiarClave(password_actual: string, password_nueva: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/auth/cambiar-clave`, {
      password_actual,
      password_nueva,
    });
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.base}/auth/me`);
  }

  // --- Sedes ---
  getSedes(activa?: 0 | 1): Observable<{ sedes: Sede[] }> {
    let params = new HttpParams();
    if (activa !== undefined) params = params.set('activa', activa);
    return this.http.get<{ sedes: Sede[] }>(`${this.base}/sedes`, { params });
  }

  createSede(payload: {
    codigo: string;
    nombre: string;
    direccion?: string | null;
    ciudad: string;
  }): Observable<Sede> {
    return this.http.post<Sede>(`${this.base}/sedes`, payload);
  }

  updateSede(
    id: number,
    payload: { nombre: string; direccion?: string | null; ciudad: string },
  ): Observable<Sede> {
    return this.http.put<Sede>(`${this.base}/sedes/${id}`, payload);
  }

  toggleSedeEstado(id: number, activa: boolean): Observable<{ id: number; activa: boolean }> {
    return this.http.patch<{ id: number; activa: boolean }>(`${this.base}/sedes/${id}/estado`, {
      activa,
    });
  }

  // --- Usuarios ---
  getUsuarios(filters: {
    rol?: UserRole;
    sede_id?: number;
    q?: string;
    page?: number;
    limit?: number;
  }): Observable<{ total: number; usuarios: UsuarioAdmin[] }> {
    let params = new HttpParams();
    if (filters.rol) params = params.set('rol', filters.rol);
    if (filters.sede_id) params = params.set('sede_id', filters.sede_id);
    if (filters.q) params = params.set('q', filters.q);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);
    return this.http.get<{ total: number; usuarios: UsuarioAdmin[] }>(`${this.base}/usuarios`, {
      params,
    });
  }

  createUsuario(payload: {
    username: string;
    nombre: string;
    email?: string | null;
    password_temporal: string;
    rol: UserRole;
    sede_id?: number | null;
  }): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(`${this.base}/usuarios`, payload);
  }

  updateUsuario(
    id: number,
    payload: { nombre: string; email?: string | null; rol: UserRole; sede_id?: number | null },
  ): Observable<unknown> {
    return this.http.put(`${this.base}/usuarios/${id}`, payload);
  }

  toggleUsuarioEstado(id: number, activo: boolean): Observable<{ id: number; activo: boolean }> {
    return this.http.patch<{ id: number; activo: boolean }>(`${this.base}/usuarios/${id}/estado`, {
      activo,
    });
  }

  resetUsuarioPassword(id: number, password_temporal: string): Observable<unknown> {
    return this.http.post(`${this.base}/usuarios/${id}/reset-password`, { password_temporal });
  }

  // --- Actividades / Campañas ---
  getActividades(): Observable<{ actividades: Actividad[] }> {
    return this.http.get<{ actividades: Actividad[] }>(`${this.base}/actividades`);
  }

  getActividadActiva(): Observable<ActividadActiva> {
    return this.http.get<ActividadActiva>(`${this.base}/actividades/activa`);
  }

  evaluarCobertura(id: number, cantidad: number): Observable<EvaluacionCobertura> {
    const params = new HttpParams().set('cantidad', cantidad);
    return this.http.get<EvaluacionCobertura>(
      `${this.base}/actividades/${id}/evaluar-cobertura`,
      { params },
    );
  }

  createActividad(payload: {
    titulo: string;
    cantidad_comprada: number;
    fecha_inicio?: string | null;
  }): Observable<Actividad> {
    return this.http.post<Actividad>(`${this.base}/actividades`, payload);
  }

  updateActividad(
    id: number,
    payload: {
      titulo: string;
      cantidad_comprada: number;
      fecha_inicio?: string | null;
      confirmar_deficit?: boolean;
    },
  ): Observable<Actividad> {
    return this.http.put<Actividad>(`${this.base}/actividades/${id}`, payload);
  }

  activarActividad(id: number): Observable<{ id: number; estado: string }> {
    return this.http.patch<{ id: number; estado: string }>(
      `${this.base}/actividades/${id}/activar`,
      {},
    );
  }

  cerrarActividad(id: number, observacion?: string): Observable<{ id: number; estado: string }> {
    return this.http.post<{ id: number; estado: string }>(`${this.base}/actividades/${id}/cerrar`, {
      confirmacion: 'CERRAR_CAMPAÑA',
      observacion,
    });
  }

  // --- Importaciones Excel ---
  presignImport(payload: {
    actividad_id: number;
    nombre_archivo: string;
    content_type: string;
  }): Observable<{ url: string; fields: Record<string, string>; s3_key: string }> {
    return this.http.post<{ url: string; fields: Record<string, string>; s3_key: string }>(
      `${this.base}/importaciones/presign`,
      payload,
    );
  }

  uploadToPresigned(
    url: string,
    fields: Record<string, string>,
    file: File,
  ): Observable<HttpEvent<unknown>> {
    if (url.includes('local-upload')) {
      return this.http.post(`${url}?key=${encodeURIComponent(fields['key'] ?? '')}`, file, {
        reportProgress: true,
        observe: 'events',
      });
    }
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      form.append(k, v);
    }
    form.append('file', file);
    return this.http.post(url, form, {
      reportProgress: true,
      observe: 'events',
    });
  }

  procesarImport(payload: {
    actividad_id: number;
    s3_key: string;
    nombre_archivo: string;
  }): Observable<{
    importacion_id: number;
    estado: string;
    total_filas: number;
    total_nuevos: number;
    total_actualizados: number;
    errores: string[];
  }> {
    return this.http.post<{
      importacion_id: number;
      estado: string;
      total_filas: number;
      total_nuevos: number;
      total_actualizados: number;
      errores: string[];
    }>(`${this.base}/importaciones/procesar`, payload);
  }

  getImportaciones(actividadId?: number): Observable<{
    total: number;
    importaciones: ImportacionExcelItem[];
  }> {
    let params = new HttpParams();
    if (actividadId) params = params.set('actividad_id', actividadId);
    return this.http.get<{ total: number; importaciones: ImportacionExcelItem[] }>(
      `${this.base}/importaciones`,
      { params },
    );
  }

  // --- Asociados ---
  buscarAsociados(
    q: string,
    actividadId?: number,
    limit = 10,
  ): Observable<{ resultados: AsociadoBusqueda[] }> {
    let params = new HttpParams().set('q', q).set('limit', limit);
    if (actividadId) params = params.set('actividad_id', actividadId);
    return this.http.get<{ resultados: AsociadoBusqueda[] }>(`${this.base}/asociados/buscar`, {
      params,
    });
  }

  createAsociado(payload: {
    cedula: string;
    nombre_completo: string;
    email?: string | null;
    direccion?: string | null;
    observacion?: string | null;
    actividad_id?: number;
  }): Observable<AsociadoBusqueda> {
    return this.http.post<AsociadoBusqueda>(`${this.base}/asociados`, payload);
  }

  patchAsociado(
    id: number,
    payload: { email?: string | null; direccion?: string | null; observacion?: string | null },
  ): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/asociados/${id}`, payload);
  }

  updateAsociadoMaestro(
    id: number,
    payload: {
      cedula: string;
      nombre_completo: string;
      email?: string | null;
      direccion?: string | null;
      fecha_ult_act?: string | null;
      observacion?: string | null;
      activo: boolean;
      motivo: string;
    },
  ): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/asociados/${id}/maestro`, payload);
  }

  getAsociadoAuditoria(id: number): Observable<{ historial: AsociadoAuditoriaItem[] }> {
    return this.http.get<{ historial: AsociadoAuditoriaItem[] }>(
      `${this.base}/asociados/${id}/auditoria`,
    );
  }

  // --- Entregas y Anulaciones ---
  confirmarEntrega(
    payload: {
      actividad_id: number;
      asociado_id: number;
      firma_base64: string;
      otra_informacion?: string | null;
    },
    idempotencyKey: string,
  ): Observable<{
    id: number;
    fecha_entrega: string;
    hora_entrega: string;
    saldo_disponible: number;
    total_entregados: number;
  }> {
    const headers = new HttpHeaders().set('X-Idempotency-Key', idempotencyKey);
    return this.http.post<{
      id: number;
      fecha_entrega: string;
      hora_entrega: string;
      saldo_disponible: number;
      total_entregados: number;
    }>(`${this.base}/entregas`, payload, { headers });
  }

  getEntregas(filters: {
    actividad_id?: number;
    q?: string;
    fecha?: string;
    sede_id?: number;
    estado?: 'ENTREGADO' | 'ANULADO';
    page?: number;
    limit?: number;
  }): Observable<{ total: number; entregas: EntregaRegistrada[] }> {
    let params = new HttpParams();
    if (filters.actividad_id) params = params.set('actividad_id', filters.actividad_id);
    if (filters.q) params = params.set('q', filters.q);
    if (filters.fecha) params = params.set('fecha', filters.fecha);
    if (filters.sede_id) params = params.set('sede_id', filters.sede_id);
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);
    return this.http.get<{ total: number; entregas: EntregaRegistrada[] }>(
      `${this.base}/entregas`,
      { params },
    );
  }

  getEntregaFirma(id: number): Observable<{ entrega_id: number; firma_preview_url: string }> {
    return this.http.get<{ entrega_id: number; firma_preview_url: string }>(
      `${this.base}/entregas/${id}/firma`,
    );
  }

  getMiTurno(): Observable<MiTurnoResponse> {
    return this.http.get<MiTurnoResponse>(`${this.base}/entregas/mi-turno`);
  }

  anularEntrega(
    entregaId: number,
    motivo: string,
  ): Observable<{ entrega_id: number; saldo_disponible: number }> {
    return this.http.post<{ entrega_id: number; saldo_disponible: number }>(
      `${this.base}/entregas/${entregaId}/anular`,
      { motivo },
    );
  }

  getAnulaciones(filters: {
    actividad_id?: number;
    q?: string;
    page?: number;
    limit?: number;
  }): Observable<{ total: number; anulaciones: AnulacionItem[] }> {
    let params = new HttpParams();
    if (filters.actividad_id) params = params.set('actividad_id', filters.actividad_id);
    if (filters.q) params = params.set('q', filters.q);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);
    return this.http.get<{ total: number; anulaciones: AnulacionItem[] }>(
      `${this.base}/anulaciones`,
      { params },
    );
  }

  // --- Reportes y Auditoría Global ---
  getControlDiario(actividadId: number, sedeId?: number): Observable<ControlDiarioResponse> {
    let params = new HttpParams().set('actividad_id', actividadId);
    if (sedeId) params = params.set('sede_id', sedeId);
    return this.http.get<ControlDiarioResponse>(`${this.base}/reportes/control-diario`, { params });
  }

  generarReporte(payload: {
    actividad_id: number;
    tipo: 'COMPLETO' | 'DIARIO';
    fecha?: string;
  }): Observable<{ job_id: string; estado: string }> {
    return this.http.post<{ job_id: string; estado: string }>(
      `${this.base}/reportes/generar`,
      payload,
    );
  }

  getReporteStatus(jobId: string): Observable<ReporteJobStatus> {
    return this.http.get<ReporteJobStatus>(`${this.base}/reportes/${jobId}`);
  }

  getAuditoriaLogs(filters: {
    accion?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    page?: number;
    limit?: number;
  }): Observable<{ total: number; logs: AuditoriaGlobalLog[] }> {
    let params = new HttpParams();
    if (filters.accion) params = params.set('accion', filters.accion);
    if (filters.fecha_desde) params = params.set('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params = params.set('fecha_hasta', filters.fecha_hasta);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);
    return this.http.get<{ total: number; logs: AuditoriaGlobalLog[] }>(
      `${this.base}/auditoria/logs`,
      { params },
    );
  }
}

