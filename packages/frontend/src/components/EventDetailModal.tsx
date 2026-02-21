import React from 'react';
import { Event } from '../types/calendar';
import { formatDateReadable, formatTime } from '../utils/dateUtils';
import './EventDetailModal.css';

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !event) {
    return null;
  }

  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event.title}</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <label className="detail-label">Date & Time</label>
            <div className="detail-value">
              <div>{formatDateReadable(startTime)}</div>
              <div>
                {formatTime(startTime)} - {formatTime(endTime)}
              </div>
            </div>
          </div>

          {event.location && (
            <div className="detail-section">
              <label className="detail-label">Location</label>
              <div className="detail-value">{event.location}</div>
            </div>
          )}

          {event.description && (
            <div className="detail-section">
              <label className="detail-label">Description</label>
              <div className="detail-value">{event.description}</div>
            </div>
          )}

          <div className="detail-section">
            <label className="detail-label">Family Member</label>
            <div className="detail-value">{event.familyMemberName}</div>
          </div>

          <div className="detail-section">
            <label className="detail-label">Source</label>
            <div className="detail-value">
              <span className="source-badge">{event.source}</span>
            </div>
          </div>

          {event.category && (
            <div className="detail-section">
              <label className="detail-label">Category</label>
              <div className="detail-value">{event.category}</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-modal-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
