import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastModule],
  template: `
    <p-toast position="top-right" />
    <router-outlet />
  `,
})
export class AppComponent {
  // Inicializa el servicio de tema desde el arranque para aplicar paleta persistida
  private readonly _theme = inject(ThemeService);
}

