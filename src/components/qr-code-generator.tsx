'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, QrCode, Copy } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  title?: string;
  description?: string;
  size?: number;
  trigger?: React.ReactNode;
}

export default function QRCodeGenerator({
  value,
  title = "QR Code",
  description,
  size = 200,
  trigger
}: QRCodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const pngUrl = canvas
      .toDataURL('image/png')
      .replace('image/png', 'image/octet-stream');

    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${title.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const copyQRCode = async () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!));
      });
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
    } catch (err) {
      console.error('Failed to copy QR code:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg border">
              <QRCodeSVG
                id="qr-canvas"
                value={value}
                size={size}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadQRCode} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={copyQRCode} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <p className="font-medium mb-1">QR Code Value:</p>
            <p className="break-all">{value}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}