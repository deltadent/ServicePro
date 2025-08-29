/**
 * Signature capture utilities using HTML5 Canvas
 */

export interface SignatureCaptureOptions {
  width?: number;
  height?: number;
  lineWidth?: number;
  strokeStyle?: string;
}

/**
 * Create a signature capture canvas with drawing functionality
 */
export class SignatureCapture {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected isDrawing = false;
  protected hasSignature = false;

  constructor(options: SignatureCaptureOptions = {}) {
    const {
      width = 400,
      height = 200,
      lineWidth = 2,
      strokeStyle = '#000000'
    } = options;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.border = '1px solid #ccc';
    this.canvas.style.borderRadius = '4px';
    this.canvas.style.touchAction = 'none'; // Prevent scrolling on touch devices

    // Get context
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    this.ctx = ctx;

    // Configure drawing settings
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Clear canvas with white background
    this.clear();

    // Bind event listeners
    this.bindEvents();
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Clear the signature
   */
  clear(): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasSignature = false;
  }

  /**
   * Check if canvas has a signature
   */
  isEmpty(): boolean {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Check if all pixels are white/transparent
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] < 255) {
        return false; // Found non-white pixel
      }
    }

    return true;
  }

  /**
   * Get signature as Blob
   */
  getBlob(type: string = 'image/png', quality?: number): Promise<Blob> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback to empty blob
          resolve(new Blob([], { type }));
        }
      }, type, quality);
    });
  }

  /**
   * Get signature as data URL
   */
  getDataUrl(type: string = 'image/png', quality?: number): string {
    return this.canvas.toDataURL(type, quality);
  }

  /**
   * Resize canvas (maintains aspect ratio)
   */
  resize(width: number, height: number): void {
    // Save current drawing
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Resize canvas
    this.canvas.width = width;
    this.canvas.height = height;

    // Restore drawing
    this.ctx.putImageData(imageData, 0, 0);

    // Update hasSignature if we had content
    this.hasSignature = !this.isEmpty();
  }

  /**
   * Protected method to start drawing
   */
  protected startDrawing(e: MouseEvent | TouchEvent): void {
    this.isDrawing = true;
    this.hasSignature = true;
    this.ctx.beginPath();

    const { x, y } = this.getEventCoordinates(e);
    this.ctx.moveTo(x, y);
  }

  /**
   * Private method for drawing
   */
  private draw(e: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) return;

    const { x, y } = this.getEventCoordinates(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  /**
   * Private method to stop drawing
   */
  private stopDrawing(): void {
    this.isDrawing = false;
    this.ctx.beginPath();
  }

  /**
   * Get event coordinates relative to canvas
   */
  private getEventCoordinates(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    let x: number, y: number;

    if (e instanceof TouchEvent) {
      const touch = e.touches[0] || e.changedTouches[0];
      x = (touch.clientX - rect.left) * scaleX;
      y = (touch.clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }

    return { x, y };
  }

  /**
   * Bind event listeners for drawing
   */
  private bindEvents(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrawing(e);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e);
    });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.stopDrawing();
    });

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

/**
 * Create a signature capture canvas with undo functionality
 */
export class SignatureCaptureWithUndo extends SignatureCapture {
  private history: ImageData[] = [];
  private maxHistoryLength = 20;

  constructor(options?: SignatureCaptureOptions) {
    super(options);
    this.saveState();
  }

  /**
   * Save current canvas state to history
   */
  private saveState(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.history.push(imageData);

    if (this.history.length > this.maxHistoryLength) {
      this.history.shift(); // Remove oldest state
    }
  }

  /**
   * Undo last drawing action
   */
  undo(): boolean {
    if (this.history.length <= 1) return false; // Nothing to undo

    this.history.pop(); // Remove current state
    const previousState = this.history[this.history.length - 1];

    this.ctx.putImageData(previousState, 0, 0);
    return true;
  }

  /**
   * Clear signature (overrides parent to maintain history)
   */
  clear(): void {
    super.clear();
    this.history = [this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)];
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.length > 1;
  }

  // Override drawing methods to save state
  protected startDrawing(e: MouseEvent | TouchEvent): void {
    this.saveState();
    super.startDrawing(e);
  }
}

/**
 * Quick signature capture component wrapper
 */
export function createSignatureCapture(options?: SignatureCaptureOptions): {
  canvas: HTMLCanvasElement;
  clear: () => void;
  undo?: () => boolean;
  canUndo?: () => boolean;
  isEmpty: () => boolean;
  getBlob: (type?: string, quality?: number) => Promise<Blob>;
  getDataUrl: (type?: string, quality?: number) => string;
  resize: (width: number, height: number) => void;
} {
  const capture = options?.lineWidth !== undefined || options?.strokeStyle !== undefined
    ? new SignatureCaptureWithUndo(options)
    : new SignatureCapture(options);

  return {
    canvas: capture.getCanvas(),
    clear: capture.clear.bind(capture),
    undo: capture instanceof SignatureCaptureWithUndo ? capture.undo.bind(capture) : undefined,
    canUndo: capture instanceof SignatureCaptureWithUndo ? capture.canUndo.bind(capture) : undefined,
    isEmpty: capture.isEmpty.bind(capture),
    getBlob: capture.getBlob.bind(capture),
    getDataUrl: capture.getDataUrl.bind(capture),
    resize: capture.resize.bind(capture)
  };
}