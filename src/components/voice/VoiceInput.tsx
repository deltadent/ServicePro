import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Square, 
  Play,
  Pause,
  Languages
} from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  language?: 'en-US' | 'ar-SA' | 'auto';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  continuous?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function VoiceInput({
  onTranscript,
  onError,
  language = 'auto',
  placeholder = 'Click the microphone to start speaking...',
  className = '',
  disabled = false,
  continuous = false
}: VoiceInputProps) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'en-US' | 'ar-SA'>('en-US');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      // Initialize recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      
      // Set initial language
      const initialLang = language === 'auto' ? 
        (navigator.language.startsWith('ar') ? 'ar-SA' : 'en-US') : 
        language;
      recognition.lang = initialLang;
      setCurrentLanguage(initialLang);

      // Event handlers
      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setInterimTranscript('');
        setConfidence(null);
        
        toast({
          title: '🎤 Voice Input Started',
          description: `Listening in ${currentLanguage === 'ar-SA' ? 'Arabic' : 'English'}...`,
          duration: 2000
        });
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setInterimTranscript('');
        
        let errorMessage = 'Voice recognition error occurred';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not available. Please check your permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please enable microphone permissions.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'language-not-supported':
            errorMessage = `Language ${currentLanguage} is not supported.`;
            break;
        }
        
        if (onError) {
          onError(errorMessage);
        }
        
        toast({
          title: '🎤 Voice Input Error',
          description: errorMessage,
          variant: 'destructive'
        });
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcriptText;
            setConfidence(result[0].confidence);
          } else {
            interimTranscript += transcriptText;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          onTranscript(transcript + finalTranscript);
          
          toast({
            title: '✅ Voice Captured',
            description: `"${finalTranscript.substring(0, 50)}${finalTranscript.length > 50 ? '...' : ''}"`,
            duration: 3000
          });
        }

        setInterimTranscript(interimTranscript);
      };

      recognitionRef.current = recognition;
      setIsInitialized(true);
    } else {
      setIsSupported(false);
      toast({
        title: '🎤 Voice Input Not Supported',
        description: 'Your browser does not support speech recognition.',
        variant: 'destructive'
      });
    }

    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current || disabled) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Set language before starting
      recognitionRef.current.lang = currentLanguage;
      recognitionRef.current.start();
    }
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en-US' ? 'ar-SA' : 'en-US';
    setCurrentLanguage(newLang);
    
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang;
    }
    
    toast({
      title: '🌐 Language Changed',
      description: `Voice input language: ${newLang === 'ar-SA' ? 'Arabic (Saudi)' : 'English (US)'}`,
      duration: 2000
    });
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(null);
  };

  if (!isSupported) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg text-center ${className}`}>
        <MicOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">Voice input not supported in this browser</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Voice Control Buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size="sm"
          onClick={toggleListening}
          disabled={disabled || !isInitialized}
          className="flex items-center gap-2"
        >
          {isListening ? (
            <>
              <MicOff className="h-4 w-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Start Recording
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          disabled={disabled || isListening}
          className="flex items-center gap-2"
        >
          <Languages className="h-4 w-4" />
          {currentLanguage === 'ar-SA' ? 'العربية' : 'English'}
        </Button>

        {transcript && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearTranscript}
            disabled={disabled || isListening}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Status and Confidence */}
      <div className="flex items-center gap-2">
        {isListening && (
          <Badge variant="default" className="animate-pulse">
            🎤 Listening...
          </Badge>
        )}
        
        {confidence !== null && (
          <Badge variant="outline">
            Confidence: {Math.round(confidence * 100)}%
          </Badge>
        )}
      </div>

      {/* Live Transcript Display */}
      {(transcript || interimTranscript || isListening) && (
        <div className="p-3 bg-gray-50 rounded-lg min-h-[60px]">
          <div className="text-sm">
            {transcript && (
              <span className="text-gray-900 font-medium">{transcript}</span>
            )}
            {interimTranscript && (
              <span className="text-gray-500 italic">{interimTranscript}</span>
            )}
            {isListening && !transcript && !interimTranscript && (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <p>• Supports both English and Arabic voice input</p>
        <p>• Click microphone to start/stop recording</p>
        <p>• Switch languages anytime when not recording</p>
      </div>
    </div>
  );
}