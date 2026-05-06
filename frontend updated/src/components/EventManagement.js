import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './EventManagement.css';

const EventManagement = ({ event, onEventUpdate }) => {
    const { user } = useAuth();
    const { updateEvent } = useEvents();
    const [loading, setLoading] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);

    // Check if current user is the event creator (supports both populated object and raw ID)
    const currentUserId = user?._id || user?.id;
    const creatorId = typeof event.creator === 'object' ? (event.creator?._id || event.creator?.id) : event.creator;
    const isCreator = creatorId && currentUserId && String(creatorId) === String(currentUserId);

    if (!isCreator) {
        return null; // Only show for event creators
    }

    const handleAction = async (userId, action) => {
        setLoading(true);
        try {
            const response = await api.put('/events/manage-attendees', {
                eventId: event._id,
                userId,
                action
            });

            toast.success(response.data.message);
            if (onEventUpdate) {
                onEventUpdate(response.data.event);
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to perform action';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="event-management">
            <div className="management-header">
                <h3>Event Management</h3>
                <p>Manage attendees and join requests</p>
            </div>

            {/* Pending Requests */}
            {event.pendingRequests && event.pendingRequests.length > 0 ? (
                <div className="pending-requests-section">
                    <h4>⚠️ Pending Join Requests ({event.pendingRequests.length})</h4>
                    <div className="requests-list">
                        {event.pendingRequests.map((request) => (
                            <div key={request._id} className="request-item">
                                <div className="request-info">
                                    <span className="request-user">{request.username}</span>
                                    <span className="request-status">Awaiting approval</span>
                                </div>
                                <div className="request-actions">
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleAction(request._id, 'approve')}
                                        disabled={loading}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleAction(request._id, 'reject')}
                                        disabled={loading}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="no-pending-requests">
                    <p>No pending join requests at the moment.</p>
                </div>
            )}

            {/* Current Attendees */}
            <div className="attendees-section">
                <h4>Current Attendees ({event.attendees.length})</h4>
                <div className="attendees-list">
                    {event.attendees.map((attendee) => (
                        <div key={attendee._id} className="attendee-item">
                            <div className="attendee-info">
                                <span className="attendee-user">{attendee.username}</span>
                                <span className="attendee-status">Confirmed</span>
                            </div>
                            <div className="attendee-actions">
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleAction(attendee._id, 'remove')}
                                    disabled={loading}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Waitlist */}
            {event.waitlist && event.waitlist.length > 0 && (
                <div className="waitlist-section">
                    <h4>Waitlist ({event.waitlist.length})</h4>
                    <div className="waitlist-list">
                        {event.waitlist.map((waitlistUser) => (
                            <div key={waitlistUser._id} className="waitlist-item">
                                <div className="waitlist-info">
                                    <span className="waitlist-user">{waitlistUser.username}</span>
                                    <span className="waitlist-status">On waitlist</span>
                                </div>
                                <div className="waitlist-actions">
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleAction(waitlistUser._id, 'promote-waitlist')}
                                        disabled={loading}
                                    >
                                        Promote
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Event Settings */}
            <div className="event-settings">
                <h4>Event Settings</h4>
                <div className="setting-item">
                    <label>
                        <input
                            type="checkbox"
                            checked={!!event.requiresApproval}
                            disabled={settingsLoading}
                            onChange={async (e) => {
                                setSettingsLoading(true);
                                try {
                                    const result = await updateEvent(event._id, {
                                        requiresApproval: e.target.checked
                                    });
                                    if (result.success && onEventUpdate) {
                                        onEventUpdate(result.event);
                                    }
                                } finally {
                                    setSettingsLoading(false);
                                }
                            }}
                        />
                        Require approval for join requests
                    </label>
                    <small>When off, users join immediately until the event is full.</small>
                </div>
            </div>
        </div>
    );
};

export default EventManagement;
