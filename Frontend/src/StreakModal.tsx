import { useEffect } from 'react';
import { Flame, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StreakView from './StreakView';
import type { StreakData, BadgeItem } from './api';
import './streak.css';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak?: StreakData;
  badges: BadgeItem[];
}

export default function StreakModal({ isOpen, onClose, streak, badges }: StreakModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="cal-streak-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cal-streak-modal-dialog">
        <div className="cal-streak-modal-topbar">
          <div className="cal-streak-modal-title-group">
            <div
              className="cal-streak-flame-circle"
              style={{ width: 34, height: 34, boxShadow: 'none' }}
            >
              <Flame size={18} />
            </div>
            <h2 id="streak-modal-title" className="cal-streak-modal-title">
              Login Streak &amp; Activity
            </h2>
          </div>

          <div className="cal-streak-modal-actions">
            <button
              type="button"
              className="cal-streak-fullscreen-btn"
              onClick={() => {
                onClose();
                navigate('/streak');
              }}
              title="Open dedicated streak page"
            >
              <span>Full Page</span>
              <ExternalLink size={13} />
            </button>

            <button
              type="button"
              className="cal-streak-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="cal-streak-modal-body">
          <StreakView streak={streak} badges={badges} />
        </div>
      </div>
    </div>
  );
}
