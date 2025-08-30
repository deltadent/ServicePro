import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  RotateCcw, 
  Check, 
  X, 
  Loader2,
  Smartphone,
  Monitor,
  Tablet
} from "lucide-react";
import { useDevice } from "@/hooks/use-device";

interface QuoteSignaturePadProps {
  onSignatureComplete: (signature: string) => void;
  onCancel: () => void;
  loading?: boolean;
  customerName?: string;
}

interface Point {
  x: number;
  y: number;
}

const QuoteSignaturePad = ({ 
  onSignatureComplete, 
  onCancel, 
  loading = false,
  customerName
}: QuoteSignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const { isMobile, isTablet } = useDevice();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      
      // Set display size
      canvas.style.width = '100%';
      canvas.style.height = isMobile ? '200px' : '150px';
      
      // Set actual size (accounting for pixel ratio)
      canvas.width = rect.width * scale;
      canvas.height = (isMobile ? 200 : 150) * scale;
      
      // Scale the drawing context
      ctx.scale(scale, scale);
      
      // Set line properties
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = isMobile ? 3 : 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isMobile]);

  const getEventPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getEventPoint(e);
    setIsDrawing(true);
    setLastPoint(point);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPoint) return;
    
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const currentPoint = getEventPoint(e);
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
    
    setLastPoint(currentPoint);
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    e.preventDefault();
    setIsDrawing(false);
    setLastPoint(null);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    try {
      // Get signature as base64 data URL
      const signatureData = canvas.toDataURL('image/png');
      onSignatureComplete(signatureData);
    } catch (error) {
      console.error('Failed to save signature:', error);
    }
  };

  const getDeviceIcon = () => {
    if (isMobile) return <Smartphone className="w-4 h-4" />;
    if (isTablet) return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className={`w-full ${isMobile ? 'max-w-full h-full' : 'max-w-2xl'}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span>Sign Quote</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getDeviceIcon()}
              <span>{isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}</span>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              {customerName ? `${customerName}, please` : 'Please'} sign in the box below to approve this quote.
            </p>
            {isMobile && (
              <p className="text-xs text-blue-600">
                💡 Tip: Use your finger to sign on the touch screen
              </p>
            )}
          </div>

          {/* Signature Canvas */}
          <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <canvas
              ref={canvasRef}
              className="block cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            
            {/* Signature line and placeholder */}
            {!hasSignature && (
              <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                <div className="w-3/4 mb-4 text-center">
                  <div className="border-b border-gray-400 mb-2"></div>
                  <p className="text-xs text-gray-400">Signature</p>
                </div>
              </div>
            )}
          </div>

          {/* Canvas Controls */}
          <div className="flex justify-center">
            <Button
              onClick={clearSignature}
              variant="outline"
              size="sm"
              disabled={!hasSignature || loading}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>

          {/* Legal Text */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>
              By signing below, I acknowledge that I have read and agree to the terms and conditions of this quote.
            </p>
            <p>
              This electronic signature has the same legal effect as a handwritten signature.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={loading}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            <Button
              onClick={saveSignature}
              disabled={!hasSignature || loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Approving...' : 'Approve Quote'}
            </Button>
          </div>

          {/* Technical Info for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 text-center space-y-1">
              <p>Device: {navigator.userAgent.split(' ')[0]}</p>
              <p>Screen: {window.screen.width}×{window.screen.height}</p>
              <p>Pixel Ratio: {window.devicePixelRatio}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteSignaturePad;