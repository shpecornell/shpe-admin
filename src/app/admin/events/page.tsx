"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { requestJson } from "@/lib/client-api";
import { EVENT_TYPES, type AdminEvent } from "@/types/admin";

type EventsResponse = {
  active_year: string;
  events: AdminEvent[];
};

type EventFormState = {
  name: string;
  date: string;
  event_type: (typeof EVENT_TYPES)[number];
  points_value: number;
  is_open: boolean;
  google_form_url: string;
  useNone: boolean;
};

const EVENT_DEFAULT_POINTS: Record<(typeof EVENT_TYPES)[number], number> = {
  Social: 2,
  "Professional Development": 2,
  GBody: 3,
  Service: 3,
  Other: 0
};

const defaultForm: EventFormState = {
  name: "",
  date: "",
  event_type: EVENT_TYPES[0],
  points_value: EVENT_DEFAULT_POINTS[EVENT_TYPES[0]],
  is_open: false,
  google_form_url: "",
  useNone: true
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

function formatEventDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${dateFormatter.format(parsed)} at ${timeFormatter.format(parsed)}`;
}

function formatEventType(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const map: Record<string, string> = {
    gbody: "GBody",
    social: "Social",
    "professional dev": "Professional Development",
    "professional development": "Professional Development",
    service: "Service",
    other: "Other"
  };
  if (map[normalized]) {
    return map[normalized];
  }
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function EventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [activeYear, setActiveYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrEvent, setQrEvent] = useState<AdminEvent | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<AdminEvent | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [form, setForm] = useState(defaultForm);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events]
  );

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson<EventsResponse>("/api/admin/events");
      setEvents(data.events);
      setActiveYear(data.active_year);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await requestJson<{ event: AdminEvent }>("/api/admin/events", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          date: new Date(form.date).toISOString(),
          event_type: form.event_type,
          points_value: Number(form.points_value),
          is_open: form.is_open,
          google_form_url: form.useNone ? "none" : form.google_form_url.trim(),
          school_year: activeYear
        })
      });

      setForm(defaultForm);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create event.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleOpen(item: AdminEvent) {
    setError(null);
    try {
      await requestJson("/api/admin/events", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          action: "toggle_open",
          is_open: !item.is_open
        })
      });
      setEvents((current) =>
        current.map((event) => (event.id === item.id ? { ...event, is_open: !event.is_open } : event))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update event status.");
    }
  }

  async function handleDelete(item: AdminEvent) {
    setError(null);
    try {
      await requestJson("/api/admin/events", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          action: "delete"
        })
      });
      setEvents((current) => current.filter((event) => event.id !== item.id));
      setDeleteEvent(null);
      setDeleteInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete event.");
    }
  }

  async function showQr(item: AdminEvent) {
    const url = `https://shpe.cornell.edu/checkin/${item.id}`;
    const generated = await QRCode.toDataURL(url, {
      margin: 1,
      width: 300,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF"
      }
    });
    setQrDataUrl(generated);
    setQrEvent(item);
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Events</h2>
        <p className="text-slate-600">Active school year: {activeYear || "Loading..."}</p>
      </div>

      {error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="panel rounded-xl p-6">
        <h3 className="mb-5 text-lg font-semibold">Create New Event</h3>
        <form className="grid gap-y-5 md:grid-cols-2 md:gap-x-6" onSubmit={handleCreate}>
          <label className="space-y-1.5 text-sm">
            Name
            <input
              className="field"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>

          <label className="space-y-1.5 text-sm">
            Date & Time
            <input
              className="field"
              type="datetime-local"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </label>

          <label className="space-y-1.5 text-sm">
            Event Type
            <select
              className="field"
              value={form.event_type}
              onChange={(e) => {
                const selectedType = e.target.value as (typeof EVENT_TYPES)[number];
                setForm((f) => ({
                  ...f,
                  event_type: selectedType,
                  // Auto-fill defaults by type; points field remains editable afterward.
                  points_value: EVENT_DEFAULT_POINTS[selectedType]
                }));
              }}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type} className="bg-white">
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm">
            Points Value
            <input
              className="field"
              type="number"
              min={0}
              required
              value={form.points_value}
              onChange={(e) => setForm((f) => ({ ...f, points_value: Number(e.target.value) }))}
            />
          </label>

          <label className="space-y-1.5 text-sm">
            School Year (auto)
            <input className="field opacity-75" readOnly value={activeYear} />
          </label>

          <div className="space-y-1.5 text-sm">
            <p>Google Form URL</p>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="googleFormMode"
                  checked={form.useNone}
                  onChange={() => setForm((f) => ({ ...f, useNone: true, google_form_url: "" }))}
                />
                None
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="googleFormMode"
                  checked={!form.useNone}
                  onChange={() => setForm((f) => ({ ...f, useNone: false }))}
                />
                Use URL
              </label>
            </div>
            <input
              className="field"
              placeholder="https://forms.gle/..."
              disabled={form.useNone}
              value={form.google_form_url}
              onChange={(e) => setForm((f) => ({ ...f, google_form_url: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.is_open}
              onChange={(e) => setForm((f) => ({ ...f, is_open: e.target.checked }))}
            />
            Open check-in immediately
          </label>

          <div className="md:col-span-2">
            <button className="btn-primary" type="submit" disabled={submitting || !activeYear}>
              {submitting ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel overflow-x-auto rounded-xl p-3">
        {loading ? (
          <p className="p-4 text-sm text-slate-600">Loading events...</p>
        ) : (
          <table className="min-w-full border-separate text-sm [border-spacing:0_0.6rem]">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="px-3 py-2">Delete</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Points</th>
                <th className="px-4 py-2">Actions</th>
                <th className="px-4 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((item) => (
                <tr key={item.id} className="group">
                  <td className="rounded-lg border border-red-200 bg-red-50 px-3 py-3.5">
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-700 text-white hover:bg-red-800"
                      onClick={() => {
                        setDeleteEvent(item);
                        setDeleteInput("");
                      }}
                      aria-label={`Delete ${item.name}`}
                      title="Delete event"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </td>
                  <td className="rounded-l-lg border-y border-l border-slate-200 bg-white px-4 py-3.5 font-medium group-hover:bg-slate-50">
                    {item.name}
                  </td>
                  <td className="border-y border-slate-200 bg-white px-4 py-3.5 group-hover:bg-slate-50">
                    {formatEventDate(item.date)}
                  </td>
                  <td className="border-y border-slate-200 bg-white px-4 py-3.5 group-hover:bg-slate-50">
                    {formatEventType(item.event_type)}
                  </td>
                  <td className="border-y border-slate-200 bg-white px-4 py-3.5 group-hover:bg-slate-50">
                    {item.points_value}
                  </td>
                  <td className="border-y border-slate-200 bg-white px-4 py-3.5 group-hover:bg-slate-50">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => void showQr(item)}>
                        Show QR
                      </button>
                    </div>
                  </td>
                  <td className="rounded-r-lg border-y border-r border-slate-200 bg-white px-4 py-3.5 text-right group-hover:bg-slate-50">
                    <button
                      className={`inline-flex flex-col items-end rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                        item.is_open
                          ? "border-green-300 bg-green-100 text-green-800"
                          : "border-red-300 bg-red-100 text-red-800"
                      }`}
                      onClick={() => void handleToggleOpen(item)}
                      aria-label={`Set ${item.name} ${item.is_open ? "closed" : "open"}`}
                      title="Toggle check-in status"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span>{item.is_open ? "Open" : "Closed"}</span>
                        <span aria-hidden="true" className="inline-flex flex-col leading-none">
                          <svg viewBox="0 0 20 20" className="h-2.5 w-2.5" fill="currentColor">
                            <path d="M10 6l4 5H6l4-5z" />
                          </svg>
                          <svg viewBox="0 0 20 20" className="h-2.5 w-2.5" fill="currentColor">
                            <path d="M10 14l-4-5h8l-4 5z" />
                          </svg>
                        </span>
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {qrEvent ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={() => setQrEvent(null)}>
          <div className="panel w-full max-w-md rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-slate-900">{qrEvent.name}</h4>
            <p className="mb-4 text-sm text-slate-600">Check-in QR Code</p>
            <div className="grid place-items-center rounded-lg bg-white p-4">
              <img src={qrDataUrl} alt="Event check-in QR code" className="h-72 w-72 max-w-full" />
            </div>
            <p className="mt-3 text-xs text-slate-600">https://shpe.cornell.edu/checkin/{qrEvent.id}</p>
            <div className="mt-4 flex gap-2">
              <a
                className="btn-secondary"
                href={qrDataUrl}
                download={`event-${qrEvent.id}-qr.png`}
              >
                Download QR
              </a>
              <button className="btn-primary" onClick={() => setQrEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteEvent ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={() => setDeleteEvent(null)}>
          <div className="panel w-full max-w-lg rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-slate-900">Delete Event</h4>
            <p className="mt-1 text-sm text-slate-600">
              This action cannot be undone. To confirm, type the event name exactly:
            </p>
            <p className="mt-2 rounded bg-slate-100 px-3 py-2 font-semibold text-slate-900">{deleteEvent.name}</p>
            <input
              className="field mt-3"
              placeholder="Type event name to confirm"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary" onClick={() => setDeleteEvent(null)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                disabled={deleteInput.trim() !== deleteEvent.name}
                onClick={() => void handleDelete(deleteEvent)}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
