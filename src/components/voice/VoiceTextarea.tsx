import React, { useState, useRef, forwardRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff,
  Languages,
  Volume2,
  VolumeX
} from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface VoiceTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  enableVoice?: boolean;
  enableTTS?: boolean;
  voiceLanguage?: 'en-US' | 'ar-SA' | 'auto';
  onValueChange?: (value: string) => void;
}

export const VoiceTextarea = forwardRef<HTMLTextAreaElement, VoiceTextareaProps>(
  ({ 
    label,
    enableVoice = true,
    enableTTS = true,
    voiceLanguage = 'auto',
    onValueChange,
    value,
    onChange,
    className = '',
    disabled = false,
    ...props 
  }, ref) => {
    const [showVoiceDialog, setShowVoiceDialog] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Combine refs
    const setRefs = (el: HTMLTextAreaElement) => {
      textareaRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
    };

    const handleVoiceTranscript = (transcript: string) => {
      const currentValue = (value as string) || '';
      const newValue = currentValue + (currentValue ? ' ' : '') + transcript;
      
      // Update the textarea value
      if (textareaRef.current) {
        textareaRef.current.value = newValue;
        
        // Trigger onChange event
        const event = new Event('input', { bubbles: true });
        Object.defineProperty(event, 'target', {
          writable: false,
          value: textareaRef.current
        });
        textareaRef.current.dispatchEvent(event);
      }

      // Call callbacks
      if (onValueChange) {
        onValueChange(newValue);
      }
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue },
          currentTarget: { value: newValue }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    };

    const handleTextToSpeech = () => {
      const text = (value as string) || '';
      
      if (!text.trim()) {
        return;
      }

      if (isSpeaking) {
        // Stop current speech
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      // Check if speech synthesis is supported
      if (!window.speechSynthesis) {
        console.warn('Text-to-speech not supported');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language based on content or preference
      if (voiceLanguage === 'ar-SA' || /[\u0600-\u06FF]/.test(text)) {
        utterance.lang = 'ar-SA';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    };

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </label>
            
            {/* Voice Controls */}
            <div className="flex items-center gap-1">
              {enableTTS && (value as string)?.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleTextToSpeech}
                  disabled={disabled}
                  className="h-6 w-6 p-0"
                  title={isSpeaking ? "Stop reading" : "Read aloud"}
                >
                  {isSpeaking ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
              )}
              
              {enableVoice && (
                <Dialog open={showVoiceDialog} onOpenChange={setShowVoiceDialog}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className="h-6 w-6 p-0"
                      title="Voice input"
                    >
                      <Mic className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        Voice Input
                      </DialogTitle>
                    </DialogHeader>
                    
                    <VoiceInput
                      onTranscript={handleVoiceTranscript}
                      language={voiceLanguage}
                      placeholder="Speak to add text to your field..."
                      continuous={false}
                    />
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowVoiceDialog(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <Textarea
            ref={setRefs}
            value={value}
            onChange={onChange}
            className={`${className} ${enableVoice ? 'pr-12' : ''}`}
            disabled={disabled}
            {...props}
          />
          
          {/* Inline Voice Button */}
          {enableVoice && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowVoiceDialog(true)}
              className="absolute right-2 top-2 h-6 w-6 p-0 opacity-60 hover:opacity-100"
              title="Voice input"
            >
              <Mic className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Voice indicators */}
        {isSpeaking && (
          <Badge variant="outline" className="text-xs animate-pulse">
            🔊 Reading text...
          </Badge>
        )}
      </div>
    );
  }
);

VoiceTextarea.displayName = "VoiceTextarea";