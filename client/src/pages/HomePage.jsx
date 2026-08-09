import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import RequirementFormModal from "../components/RequirementFormModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { IconPlus, IconTrash, IconEdit, IconCalendar, IconCheck, IconRotate } from "../components/Icons.jsx";

const DAY_LABELS = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};

function dayOfWeekNum(d) {
  const dw = d.getDay();
  return dw === 0 ? 7 : dw;
}

function mondayOf(date) {
  const d = new Date(date);
  const diff = dayOfWeekNum(d) - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n, hour = 0) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a, b) {
  return toDateStr(a) === toDateStr(b);
}

function isWeekday(d) {
  return dayOfWeekNum(d) <= 5;
}

function snapToWeekday(d) {
  if (isWeekday(d)) return d;
  return addDays(d, 8 - dayOfWeekNum(d));
}

function navDay(d, dir) {
  const num = dayOfWeekNum(d);
  if (dir < 0) return num === 1 ? addDays(d, -3) : addDays(d, -1);
  return num === 5 ? addDays(d, 3) : addDays(d, 1);
}

export default function HomePage() {
  const { showToast, showError } = useToast();
  const [selected, setSelected] = useState(() => snapToWeekday(new Date()));
  const [data, setData] = useState(null);
  const [labs, setLabs] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(() => {
    const week = toDateStr(mondayOf(selected));
    api
      .getRequirements(week)
      .then(setData)
      .catch((e) => showError(e.message));
  }, [selected, showError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.getLabs().then(setLabs).catch(() => {});
    api.getChemicals().then(setChemicals).catch(() => {});
  }, []);

  if (data === null) return <div className="loading">Loading…</div>;

  const num = dayOfWeekNum(selected);
  const dayRequirements = data.requirements.filter((r) => r.dayOfWeek === num);
  const completedCount = dayRequirements.filter((r) => r.completed).length;
  const isToday = sameDay(selected, new Date());

  const toggleComplete = async (req) => {
    setToggling(req._id);
    try {
      if (req.completed) {
        await api.uncompleteRequirement(req._id, req.date);
        showToast(`Undid "${req.lab?.name}"`);
      } else {
        await api.completeRequirement(req._id, req.date);
        showToast(`"${req.lab?.name}" marked completed`);
      }
      load();
    } catch (e) {
      showError(e.message);
    } finally {
      setToggling(null);
    }
  };

  const save = async (payload) => {
    if (editing) {
      await api.updateRequirement(editing._id, payload);
      showToast("Requirement updated");
    } else {
      await api.createRequirement(payload);
      showToast("Requirement added");
    }
    setEditing(null);
    load();
  };

  const remove = async () => {
    try {
      await api.deleteRequirement(deleting._id);
      showToast("Requirement deleted");
      load();
    } catch (e) {
      showError(e.message);
    }
  };

  const dateLabel = selected.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Schedule</h1>
          <p className="page-subtitle">One day at a time — schedules repeat every week</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <IconPlus size={15} /> Add requirement
        </button>
      </div>

      <div className="day-nav">
        <button className="btn btn-secondary" onClick={() => setSelected(navDay(selected, -1))}>
          ← Prev day
        </button>
        <div className="week-title">
          <IconCalendar size={16} />
          <span>
            {DAY_LABELS[num]}
            {isToday && <span className="badge badge-success" style={{ marginLeft: 8 }}>Today</span>}
            <span className="muted" style={{ display: "block", fontSize: 12.5, fontWeight: 400 }}>
              {selected.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {!isToday && (
            <button className="btn btn-secondary" onClick={() => setSelected(snapToWeekday(new Date()))}>
              Today
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setSelected(navDay(selected, 1))}>
            Next day →
          </button>
        </div>
      </div>

      <div className="card day-view">
        <div className="day-head">
          <div>
            <div className="day-name">{DAY_LABELS[num]}</div>
            <div className="day-date">
              {selected.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
            </div>
          </div>
          {dayRequirements.length > 0 && (
            <span className="badge badge-accent">
              {completedCount}/{dayRequirements.length} done
            </span>
          )}
        </div>

        {dayRequirements.length === 0 ? (
          <EmptyState
            icon={<IconCalendar size={40} />}
            title={`No labs scheduled on ${DAY_LABELS[num]}`}
            hint={`Click "Add requirement" to schedule a lab for ${DAY_LABELS[num]}. It repeats every week on this day.`}
          />
        ) : (
          dayRequirements.map((req) => (
            <div className={`req-row${req.completed ? " req-done" : ""}`} key={req._id}>
              <div className="req-row-main">
                <div className="req-top" style={{ marginBottom: 2 }}>
                  <span className="req-lab">{req.lab?.name || "Unassigned lab"}</span>
                  {req.completed && (
                    <span className="badge badge-success">
                      <IconCheck size={12} /> Done
                    </span>
                  )}
                </div>
                {(req.time || req.lab?.location) && (
                  <div className="req-loc">
                    {req.time && <span style={{ color: "var(--accent)", fontWeight: 600 }}>{req.time}</span>}
                    {req.time && req.lab?.location && <span> · </span>}
                    {req.lab?.location}
                  </div>
                )}
                {req.materials.length > 0 && (
                  <div className="req-mats">
                    {req.materials.map((m) => (
                      <span className="mat-chip" key={m.chemical._id || m.chemical}>
                        {m.chemical?.name || "Unknown"}
                        {m.quantity > 0 && ` · ${m.quantity} ${m.chemical?.unit || ""}`.trim()}
                      </span>
                    ))}
                  </div>
                )}
                {req.notes && <div className="req-notes">{req.notes}</div>}
              </div>
              <div className="req-row-side">
                <button
                  className={`btn ${req.completed ? "btn-secondary" : "btn-primary"}`}
                  onClick={() => toggleComplete(req)}
                  disabled={toggling === req._id}
                >
                  {toggling === req._id ? (
                    "Working…"
                  ) : req.completed ? (
                    <>
                      <IconRotate size={14} /> Undo
                    </>
                  ) : (
                    <>
                      <IconCheck size={14} /> Mark completed
                    </>
                  )}
                </button>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setEditing(req);
                      setModalOpen(true);
                    }}
                    title="Edit requirement"
                  >
                    <IconEdit size={14} />
                  </button>
                  <button
                    className="btn-icon icon-btn-danger"
                    onClick={() => setDeleting(req)}
                    title="Delete requirement"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <RequirementFormModal
          requirement={editing}
          labs={labs}
          chemicals={chemicals}
          presetDay={num}
          onSave={save}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete requirement"
          message={`Delete "${deleting.lab?.name}" from the schedule?`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}