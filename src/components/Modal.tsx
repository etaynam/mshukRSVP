import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // סגירת המודאל בלחיצה על אזורים מחוץ לתוכן
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // מניעת גלילה ברקע
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // מניעת הרנדור אם המודאל סגור
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all duration-300">
      <div 
        ref={modalRef}
        className="glass-card rounded-2xl p-0 w-full max-w-md transform transition-all duration-300 scale-100 opacity-100"
      >
        <div className="flex justify-between items-center p-6 border-b border-emerald-500/20">
          {title && <h3 className="text-xl font-bold">{title}</h3>}
          <button
            onClick={onClose}
            className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 