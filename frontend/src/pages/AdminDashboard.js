import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const userSearchRef = useRef(userSearch);
  userSearchRef.current = userSearch;
  const [usersLoading, setUsersLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const q = userSearchRef.current?.trim();
      const res = await api.get('/admin/users', { params: { q: q || undefined, limit: 50 } });
      setUsers(res.data.users || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data.events || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load events');
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data.analytics || null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'events') loadEvents();
    if (tab === 'analytics') loadAnalytics();
  }, [tab, loadUsers, loadEvents, loadAnalytics]);

  const toggleUserActive = async (u, nextActive) => {
    try {
      await api.patch(`/admin/users/${u._id}`, { isActive: nextActive });
      toast.success(nextActive ? 'User reactivated' : 'User deactivated');
      loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    }
  };

  const deactivateEvent = async (ev) => {
    if (!window.confirm(`Deactivate event "${ev.title}"?`)) return;
    try {
      await api.delete(`/admin/events/${ev._id}`);
      toast.success('Event deactivated');
      loadEvents();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin</h1>
      <div className="admin-tabs">
        <button type="button" className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Users
        </button>
        <button type="button" className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>
          Events
        </button>
        <button type="button" className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>
          Analytics
        </button>
      </div>

      {tab === 'users' && (
        <section className="admin-panel">
          <div className="admin-toolbar">
            <input
              type="search"
              placeholder="Search username or email"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <button type="button" className="btn btn-secondary" onClick={loadUsers} disabled={usersLoading}>
              Search
            </button>
          </div>
          {usersLoading ? (
            <p>Loading users…</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.isActive === false ? 'No' : 'Yes'}</td>
                    <td>
                      {u.isActive === false ? (
                        <button type="button" className="btn btn-sm" onClick={() => toggleUserActive(u, true)}>
                          Reactivate
                        </button>
                      ) : (
                        <button type="button" className="btn btn-sm danger" onClick={() => toggleUserActive(u, false)}>
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === 'events' && (
        <section className="admin-panel">
          {eventsLoading ? (
            <p>Loading events…</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Creator</th>
                  <th>Schedule</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev._id}>
                    <td>{ev.title}</td>
                    <td>{ev.creator?.username || '—'}</td>
                    <td>{ev.schedule ? format(new Date(ev.schedule), 'MMM d, yyyy') : '—'}</td>
                    <td>{ev.isActive ? 'Yes' : 'No'}</td>
                    <td>
                      {ev.isActive ? (
                        <button type="button" className="btn btn-sm danger" onClick={() => deactivateEvent(ev)}>
                          Deactivate
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === 'analytics' && (
        <section className="admin-panel analytics-grid">
          {analyticsLoading ? (
            <p>Loading analytics…</p>
          ) : analytics ? (
            <>
              <div className="stat-card">
                <h3>Users</h3>
                <p className="stat-big">{analytics.users}</p>
                <p className="muted">Active: {analytics.activeUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Events</h3>
                <p className="stat-big">{analytics.events}</p>
                <p className="muted">Active: {analytics.activeEvents}</p>
              </div>
              <div className="stat-card">
                <h3>Feedback entries</h3>
                <p className="stat-big">{analytics.feedbackEntries}</p>
                <p className="muted">Avg rating: {analytics.averageRating}</p>
              </div>
              <div className="stat-card">
                <h3>RSVP slots</h3>
                <p className="stat-big">{analytics.totalRsvpSlots}</p>
                <p className="muted">Attendee + pending + waitlist</p>
              </div>
            </>
          ) : (
            <p>No data</p>
          )}
        </section>
      )}
    </div>
  );
};

export default AdminDashboard;
