import React, { useState, useRef, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  Languages
} from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface VoiceInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  enableVoice?: boolean;
  enableTTS?: boolean;
  voiceLanguage?: 'en-US' | 'ar-SA' | 'auto';
  onValueChange?: (value: string) => void;
  voiceButtonVariant?: 'inline' | 'external';
}

export const VoiceInputField = forwardRef<HTMLInputElement, VoiceInputFieldProps>(
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
    voiceButtonVariant = 'inline',
    ...props 
  }, ref) => {
    const [showVoicePopover, setShowVoicePopover] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Combine refs
    const setRefs = (el: HTMLInputElement) => {
      inputRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
    };

    const handleVoiceTranscript = (transcript: string) => {
      const currentValue = (value as string) || '';
      const newValue = currentValue + (currentValue ? ' ' : '') + transcript;
      
      // Update the input value
      if (inputRef.current) {
        inputRef.current.value = newValue;
        
        // Trigger onChange event
        const event = new Event('input', { bubbles: true });
        Object.defineProperty(event, 'target', {
          writable: false,
          value: inputRef.current
        });
        inputRef.current.dispatchEvent(event);
      }

      // Call callbacks
      if (onValueChange) {
        onValueChange(newValue);
      }
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue },
          currentTarget: { value: newValue }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }

      // Close popover after successful transcript
      setShowVoicePopover(false);
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
        utterance.rate = 0.8; // Slower for Arabic
      } else {
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    };

    const VoiceControls = () => (
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
          <Popover open={showVoicePopover} onOpenChange={setShowVoicePopover}>
            <PopoverTrigger asChild>
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
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mic className="h-4 w-4" />
                  Voice Input
                </div>
                
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  language={voiceLanguage}
                  placeholder="Speak to add text..."
                  continuous={false}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </label>
            
            {voiceButtonVariant === 'external' && <VoiceControls />}
          </div>
        )}

        <div className="relative">
          <Input
            ref={setRefs}
            value={value}
            onChange={onChange}
            className={`${className} ${voiceButtonVariant === 'inline' && enableVoice ? 'pr-20' : ''}`}
            disabled={disabled}
            {...props}
          />
          
          {/* Inline Voice Controls */}
          {voiceButtonVariant === 'inline' && !disabled && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <VoiceControls />
            </div>
          )}
        </div>

        {/* Voice indicators */}
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <Badge variant="outline" className="text-xs animate-pulse">
              🔊 Reading...
            </Badge>
          )}
        </div>
      </div>
    );
  }
);

VoiceInputField.displayName = "VoiceInputField";