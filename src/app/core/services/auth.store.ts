import { Injectable, computed, signal } from '@angular/core';
import type { UserRole, UsuarioAuth } from '../models/api.models';

type AuthBroadcastMessage =
  | { type: 'TOKEN_UPDATED'; accessToken: string; mustChangePassword: boolean }
  | { type: 'LOGOUT' };

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<UsuarioAuth | null>(null);
  private readonly _mustChangePassword = signal<boolean>(false);
  private readonly _activeCampaign = signal<{ id: number; titulo: string; estado: string } | null>(null);

  readonly accessToken = this._accessToken.asReadonly();
  readonly user = this._user.asReadonly();
  readonly mustChangePassword = this._mustChangePassword.asReadonly();
  readonly activeCampaign = this._activeCampaign.asReadonly();

  readonly isAuthenticated = computed(() => Boolean(this._accessToken() && this._user()));
  readonly role = computed<UserRole | null>(() => this._user()?.rol ?? null);
  readonly isCampaignClosed = computed(() => this._activeCampaign()?.estado === 'CERRADA');

  private readonly channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cemcop_auth_channel') : null;

  constructor() {
    this.channel?.addEventListener('message', (event: MessageEvent<AuthBroadcastMessage>) => {
      if (event.data?.type === 'TOKEN_UPDATED') {
        this._accessToken.set(event.data.accessToken);
        this._mustChangePassword.set(event.data.mustChangePassword);
      } else if (event.data?.type === 'LOGOUT') {
        this.clearLocalSession(false);
      }
    });
  }

  setSession(
    accessToken: string,
    user: UsuarioAuth,
    mustChangePassword: boolean,
    broadcast = true,
  ): void {
    this._accessToken.set(accessToken);
    this._user.set(user);
    this._mustChangePassword.set(mustChangePassword);
    if (broadcast) {
      this.channel?.postMessage({
        type: 'TOKEN_UPDATED',
        accessToken,
        mustChangePassword,
      } satisfies AuthBroadcastMessage);
    }
  }

  updateToken(accessToken: string, mustChangePassword: boolean, broadcast = true): void {
    this._accessToken.set(accessToken);
    this._mustChangePassword.set(mustChangePassword);
    if (broadcast) {
      this.channel?.postMessage({
        type: 'TOKEN_UPDATED',
        accessToken,
        mustChangePassword,
      } satisfies AuthBroadcastMessage);
    }
  }

  setUserAndCampaign(
    user: UsuarioAuth,
    campana: { id: number; titulo: string; estado: string } | null,
  ): void {
    this._user.set(user);
    this._mustChangePassword.set(Boolean(user.debe_cambiar_clave));
    this._activeCampaign.set(campana);
  }

  setActiveCampaign(campana: { id: number; titulo: string; estado: string } | null): void {
    this._activeCampaign.set(campana);
  }

  clearLocalSession(broadcast = true): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._mustChangePassword.set(false);
    this._activeCampaign.set(null);
    if (broadcast) {
      this.channel?.postMessage({ type: 'LOGOUT' } satisfies AuthBroadcastMessage);
    }
  }
}

