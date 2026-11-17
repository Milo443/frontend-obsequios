export type UserRole = 'SUPER_ADMIN' | 'ADMINISTRADOR' | 'REPARTIDOR';

export interface Sede {
  id: number;
  codigo: string;
  nombre: string;
  direccion: string | null;
  ciudad: string;
  activa: boolean;
}

export interface UsuarioAuth {
  id: number;
  username: string;
  nombre: string;
  email: string | null;
  rol: UserRole;
  debe_cambiar_clave?: boolean;
  sede: { id: number; codigo: string; nombre: string } | null;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  debe_cambiar_clave: boolean;
  usuario: UsuarioAuth;
}

export interface RefreshResponse {
  access_token: string;
  expires_in: number;
  debe_cambiar_clave: boolean;
}

export interface MeResponse {
  usuario: UsuarioAuth;
  campana_activa: { id: number; titulo: string; estado: string } | null;
}

export interface UsuarioAdmin {
  id: number;
  username: string;
  nombre: string;
  email: string | null;
  rol: UserRole;
  debe_cambiar_clave: boolean;
  sede_id: number | null;
  sede_nombre: string | null;
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
}

export interface Actividad {
  id: number;
  titulo: string;
  cantidad_comprada: number;
  saldo_disponible: number;
  total_entregados: number;
  estado: 'BORRADOR' | 'ACTIVA' | 'CERRADA';
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export interface ActividadActiva extends Actividad {
  entregados_hoy: number;
  asociados_activos_base: number;
  por_sede: Array<{
    sede_id: number;
    codigo: string;
    nombre: string;
    entregados: number;
  }>;
}

export interface EvaluacionCobertura {
  cantidad_ingresada: number;
  asociados_activos: number;
  diferencia: number;
  tipo_alerta: 'DEFICIT' | 'SUPERAVIT' | 'OPTIMA';
  requiere_confirmacion: boolean;
  mensaje: string;
}

export interface AsociadoBusqueda {
  id: number;
  cedula: string;
  nombre_completo: string;
  email: string | null;
  direccion: string | null;
  fecha_ult_act: string | null;
  observacion: string | null;
  activo: boolean;
  estado_entrega: 'ENTREGADO' | 'PENDIENTE';
  entrega: {
    id: number;
    fecha_entrega: string;
    hora_entrega: string;
    otra_informacion: string | null;
    firma_preview_url: string | null;
  } | null;
}

export interface AsociadoAuditoriaItem {
  id: number;
  asociado_id: number;
  usuario_id: number;
  usuario_nombre: string;
  rol_usuario: 'SUPER_ADMIN' | 'ADMINISTRADOR';
  accion: 'CREACION' | 'MODIF_PARCIAL' | 'EDICION_MAESTRA';
  campo_modificado: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  motivo: string | null;
  ip_origen: string;
  fecha_cambio: string;
}

export interface EntregaRegistrada {
  id: number;
  actividad_id: number;
  asociado_id: number;
  cedula_historica: string;
  nombre_historico: string;
  estado: 'ENTREGADO' | 'ANULADO';
  fecha_entrega: string;
  hora_entrega: string;
  otra_informacion: string | null;
  sede: { id: number; nombre: string };
  repartidor: { id: number; nombre: string };
  tiene_firma: boolean;
}

export interface MiTurnoResponse {
  fecha: string;
  sede: { id: number; codigo: string; nombre: string } | null;
  entregados_hoy: number;
  ultimas_entregas: Array<{
    id: number;
    cedula_historica: string;
    nombre_historico: string;
    estado: 'ENTREGADO' | 'ANULADO';
    hora_entrega: string;
    otra_informacion: string | null;
  }>;
}

export interface AnulacionItem {
  id: number;
  entrega_id: number;
  asociado_id: number;
  cedula: string;
  nombre_asociado: string;
  admin_id: number;
  admin_nombre: string;
  motivo: string;
  fecha_anulacion: string;
}

export interface ImportacionExcelItem {
  id: number;
  actividad_id: number;
  usuario_id: number;
  usuario_nombre: string;
  nombre_archivo: string;
  total_filas: number;
  total_nuevos: number;
  total_actualizados: number;
  estado: 'PROCESANDO' | 'EXITOSO' | 'FALLIDO' | 'CON_ERRORES';
  log_observaciones: string | null;
  created_at: string;
}

export interface ControlDiarioResponse {
  actividad_id: number;
  titulo: string;
  cantidad_comprada: number;
  dias: Array<{
    fecha: string;
    entregados_brutos: number;
    anulaciones_dia: number;
    entregados_netos: number;
    acumulado_neto: number;
    saldo: number;
  }>;
}

export interface ReporteJobStatus {
  job_id: string;
  estado: 'PENDIENTE' | 'PROCESANDO' | 'LISTO' | 'FALLIDO';
  nombre_archivo?: string;
  download_url?: string;
  error?: string | null;
}

export interface AuditoriaGlobalLog {
  id: number;
  usuario_id: number | null;
  usuario_nombre: string | null;
  usuario_username: string | null;
  accion: string;
  tabla_afectada: string | null;
  registro_id: number | null;
  detalle_operacion: string | null;
  ip_origen: string;
  user_agent: string | null;
  created_at: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

