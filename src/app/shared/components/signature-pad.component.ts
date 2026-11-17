import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <div class="sig-wrapper">
      <div class="cemcop-flex-between mb-1">
        <span class="cemcop-label" style="margin-bottom: 0">
          Firma Digital Manuscrita *
        </span>
        <p-button
          label="Limpiar firma"
          icon="pi pi-eraser"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="clear()"
        />
      </div>

      <div #container class="signature-canvas-host sig-box" [class.sig-valid]="isValid()">
        <canvas
          #canvas
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp($event)"
          (pointercancel)="onPointerUp($event)"
        ></canvas>
        @if (strokeCount() === 0) {
          <div class="sig-placeholder">Firme aquí con el dedo, lápiz táctil o mouse</div>
        }
      </div>

      <small class="cemcop-muted">
        @if (isValid()) {
          Firma capturada correctamente ({{ strokeCount() }} trazos).
        } @else {
          Se requiere una firma legible antes de confirmar la entrega.
        }
      </small>
    </div>
  `,
  styles: `
    .sig-wrapper {
      width: 100%;
    }
    .sig-box {
      position: relative;
      width: 100%;
      height: clamp(180px, 28vh, 250px);
      background: #ffffff;
      border: 2px dashed var(--cemcop-border);
      border-radius: var(--cemcop-radius);
      overflow: hidden;
    }
    .sig-box.sig-valid {
      border-style: solid;
      border-color: var(--cemcop-primary);
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: crosshair;
      touch-action: none;
    }
    .sig-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      color: #94a3b8;
      font-size: 0.95rem;
      text-align: center;
      padding: 1rem;
    }
  `,
})
export class SignaturePadComponent implements AfterViewInit, OnDestroy {
  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly containerRef = viewChild.required<ElementRef<HTMLDivElement>>('container');

  readonly signatureChanged = output<{ valid: boolean; dataUrl: string | null }>();

  readonly strokeCount = signal(0);
  readonly isValid = signal(false);

  private strokes: Point[][] = [];
  private activeStroke: Point[] | null = null;
  private activePointerId: number | null = null;
  private totalLength = 0;
  private cssWidth = 0;
  private cssHeight = 0;
  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    this.resizeCanvas();
    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(this.containerRef().nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private resizeCanvas(): void {
    const container = this.containerRef().nativeElement;
    const canvas = this.canvasRef().nativeElement;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const prevW = this.cssWidth || rect.width;
    const prevH = this.cssHeight || rect.height;
    const scaleX = rect.width / prevW;
    const scaleY = rect.height / prevH;

    if (this.cssWidth > 0 && (scaleX !== 1 || scaleY !== 1)) {
      this.strokes = this.strokes.map((s) =>
        s.map((pt) => ({ x: pt.x * scaleX, y: pt.y * scaleY })),
      );
    }

    this.cssWidth = rect.width;
    this.cssHeight = rect.height;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.redraw(ctx);
    }
  }

  private getLocalPoint(event: PointerEvent): Point {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    if (this.activePointerId !== null) return;

    const canvas = this.canvasRef().nativeElement;
    canvas.setPointerCapture(event.pointerId);
    this.activePointerId = event.pointerId;

    const pt = this.getLocalPoint(event);
    this.activeStroke = [pt];
    this.strokes.push(this.activeStroke);
    this.strokeCount.set(this.strokes.length);
  }

  onPointerMove(event: PointerEvent): void {
    event.preventDefault();
    if (this.activePointerId !== event.pointerId || !this.activeStroke) return;

    const pt = this.getLocalPoint(event);
    const prev = this.activeStroke[this.activeStroke.length - 1];
    if (prev) {
      this.totalLength += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    }
    this.activeStroke.push(pt);

    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (ctx && prev) {
      this.configureStrokeStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  }

  onPointerUp(event: PointerEvent): void {
    event.preventDefault();
    if (this.activePointerId !== event.pointerId) return;

    try {
      this.canvasRef().nativeElement.releasePointerCapture(event.pointerId);
    } catch {
      // Ignorar si ya fue liberado
    }

    this.activePointerId = null;
    this.activeStroke = null;
    this.evaluateAndEmit();
  }

  private configureStrokeStyle(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  private redraw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    this.configureStrokeStyle(ctx);

    for (const stroke of this.strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0]!.x, stroke[0]!.y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i]!.x, stroke[i]!.y);
      }
      ctx.stroke();
    }
  }

  private evaluateAndEmit(): void {
    const valid = this.strokes.length >= 1 && this.totalLength >= 18;
    this.isValid.set(valid);
    this.signatureChanged.emit({
      valid,
      dataUrl: valid ? this.toPngDataUrl() : null,
    });
  }

  clear(): void {
    this.strokes = [];
    this.activeStroke = null;
    this.totalLength = 0;
    this.strokeCount.set(0);
    this.isValid.set(false);
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    }
    this.signatureChanged.emit({ valid: false, dataUrl: null });
  }

  toPngDataUrl(): string | null {
    if (this.strokes.length === 0 || this.totalLength < 18) return null;
    return this.canvasRef().nativeElement.toDataURL('image/png');
  }
}

